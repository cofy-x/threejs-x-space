"""Regression checks in a separate disposable Blender process; no extra dependencies.

Run from the repository root:
blender --background --factory-startup --python packages/experience-turbofan/scripts/check-blade-study.py
"""

import json
import math
import runpy
import struct
import sys
import tempfile
from pathlib import Path

import bpy


def check(condition, message):
    if not condition:
        raise AssertionError(message)


def data_counts():
    return tuple(len(getattr(bpy.data, name)) for name in (
        "objects", "meshes", "materials", "worlds", "cameras", "lights", "collections",
    ))


def context_state():
    return (
        bpy.context.scene.as_pointer(), bpy.context.mode,
        bpy.context.active_object.as_pointer() if bpy.context.active_object else None,
        frozenset(obj.as_pointer() for obj in bpy.context.selected_objects),
    )


def read_glb(path):
    content = path.read_bytes()
    magic, version, size = struct.unpack_from("<4sII", content)
    check(magic == b"glTF" and version == 2 and size == len(content), "Invalid GLB header")
    length, chunk_type = struct.unpack_from("<I4s", content, 12)
    check(chunk_type == b"JSON", "Missing GLB JSON chunk")
    return json.loads(content[20:20 + length])


def main():
    # Refuse execution through a connected interactive Blender session.
    if not bpy.app.background or "--factory-startup" not in sys.argv:
        raise RuntimeError("Run this check in a separate --background --factory-startup Blender process")
    script = Path(__file__).with_name("build-blade-study.py")
    study = runpy.run_path(str(script), run_name="blade_study_checks")
    build = study["build_study"]
    export = study["export_preview"]

    outside = bpy.context.scene
    collision_scene = bpy.data.scenes.new(study["SCENE_NAME"])
    collision_collection = bpy.data.collections.new(study["COLLECTION_NAME"])
    outside.collection.children.link(collision_collection)
    collision_material = bpy.data.materials.new("Turbofan Study Titanium")
    collision_material.diffuse_color = (0.1, 0.2, 0.3, 1)
    collision_material_color = tuple(collision_material.diffuse_color)
    collision_material_nodes = collision_material.node_tree.as_pointer() if collision_material.node_tree else None
    collision_world = bpy.data.worlds.new("Turbofan Study World")
    collision_world.color = (0.12, 0.23, 0.34)
    collision_world_color = tuple(collision_world.color)
    collision_world_nodes = collision_world.node_tree.as_pointer() if collision_world.node_tree else None
    orphan_mesh = bpy.data.meshes.new("Turbofan Swept Airfoil unrelated")
    user_mesh = bpy.data.meshes.new("User mesh")
    user_mesh.from_pydata([(0, 0, 0), (1, 0, 0), (0, 1, 0)], [], [(0, 1, 2)])
    user_obj = bpy.data.objects.new("User object", user_mesh)
    collision_collection.objects.link(user_obj)
    before_context = context_state()

    scene, generated = build()
    check(context_state() == before_context, "Construction changed the active scene or selection")
    check(scene != collision_scene and generated != collision_collection, "Names hijacked user data")
    check(tuple(collision_material.diffuse_color) == collision_material_color, "Name-collision material changed")
    check((collision_material.node_tree.as_pointer() if collision_material.node_tree else None) == collision_material_nodes, "Name-collision material node tree changed")
    check(tuple(collision_world.color) == collision_world_color, "Name-collision world changed")
    check((collision_world.node_tree.as_pointer() if collision_world.node_tree else None) == collision_world_nodes, "Name-collision world node tree changed")
    check(orphan_mesh.name in bpy.data.meshes, "Unrelated orphan mesh was deleted")
    blades = [obj for obj in generated.objects if obj.type == "MESH"]
    mesh = blades[0].data
    check(len(blades) == 24 and len({obj.data.as_pointer() for obj in blades}) == 1, "Expected 24 linked blades")
    check(len(mesh.vertices) == 608 and len(mesh.polygons) == 1084, "Airfoil topology changed")
    for vertex in list(mesh.vertices)[-32:]:
        check(abs(math.hypot(vertex.co.y, vertex.co.z) - 1.475) < 1e-6, "Fan tip exceeds radial envelope")
    for offset, tip in [(544, False), (576, True)]:
        contour = [vertex.co for vertex in list(mesh.vertices)[offset:offset + 32]]
        area = abs(sum(a.x * b.z - b.x * a.z for a, b in zip(contour, contour[1:] + contour[:1]))) / 2
        cap_faces = [face for face in mesh.polygons if all(offset <= index < offset + 32 for index in face.vertices)]
        triangle_areas = []
        for face in cap_faces:
            a, b, c = [mesh.vertices[index].co for index in face.vertices]
            signed_area = ((b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x)) / 2
            check(signed_area < 0 if tip else signed_area > 0, "Cap winding faces inward")
            triangle_areas.append(abs(signed_area))
        check(len(cap_faces) == 30 and abs(sum(triangle_areas) - area) < 1e-7, "Concave cap triangulation overlaps or misses its contour")

    baseline = data_counts()
    scene, generated = build()
    check(data_counts() == baseline, "Clean rerun leaked generated datablocks")
    check(context_state() == before_context, "Clean rerun changed context")

    linked = next(obj for obj in generated.objects if obj.type == "MESH")
    collision_collection.objects.link(linked)
    shared_mesh = linked.data
    shared_material = shared_mesh.materials[0]
    external_copy = bpy.data.objects.new("External mesh reuse", shared_mesh)
    collision_collection.objects.link(external_copy)
    shared_world = scene.world
    outside.world = shared_world
    old_world_color = tuple(next(node for node in shared_world.node_tree.nodes if node.type == "BACKGROUND").inputs[0].default_value)
    added = bpy.data.objects.new("User addition in study", user_mesh)
    generated.objects.link(added)
    duplicated = linked.copy()
    generated.objects.link(duplicated)
    scene, generated = build()
    check(collision_collection.objects.get(linked.name) == linked, "Externally linked blade was deleted")
    check(external_copy.data == shared_mesh and shared_mesh.materials[0] == shared_material, "Shared mesh or material was altered")
    check(scene.objects.get(added.name) == added, "User addition was deleted")
    check(scene.objects.get(duplicated.name) == duplicated, "User-duplicated object was deleted")
    check(outside.world == shared_world and scene.world != shared_world, "Shared world was replaced externally")
    check(tuple(next(node for node in shared_world.node_tree.nodes if node.type == "BACKGROUND").inputs[0].default_value) == old_world_color, "Shared world was rewritten")

    externally_linked_collection = generated
    external_ids = {obj.as_pointer() for obj in generated.objects}
    collision_scene.collection.children.link(generated)
    scene, generated = build()
    check(collision_scene.collection.children.get(externally_linked_collection.name) == externally_linked_collection, "Shared collection was removed externally")
    check({obj.as_pointer() for obj in externally_linked_collection.objects} == external_ids, "Shared collection contents changed")

    # Test active generated objects separately: rerun must retain an ongoing edit.
    bpy.context.window.scene = scene
    active_blade = next(obj for obj in generated.objects if obj.type == "MESH")
    active_blade.select_set(True)
    bpy.context.view_layer.objects.active = active_blade
    bpy.ops.object.mode_set(mode="EDIT")
    editing_context = context_state()
    scene, generated = build()
    check(context_state() == editing_context, "Rerun interrupted an active study edit")

    with tempfile.TemporaryDirectory(prefix="turbofan-study-check-") as folder:
        output = Path(folder) / "study.glb"
        export(scene, generated, output)
        check(context_state() == editing_context, "Export changed mode, active object, or selection")
        glb = read_glb(output)
        mesh_nodes = [node for node in glb.get("nodes", []) if "mesh" in node]
        check(len(mesh_nodes) == 24 and len(glb.get("meshes", [])) == 1, "Export included content outside the new study collection")
        check(len(glb.get("scenes", [])) == 1, "Export included unrelated scenes")
        check("cameras" not in glb and "KHR_lights_punctual" not in glb.get("extensions", {}), "Export included inspection camera/lights")
        before_invalid = data_counts()
        try:
            export(scene, generated, Path(folder) / "wrong.txt")
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid export extension was accepted")
        check(data_counts() == before_invalid and context_state() == editing_context, "Invalid export changed data or context")

    check(collision_collection.objects.get(user_obj.name) == user_obj, "Unrelated user object was removed")
    bpy.ops.object.mode_set(mode="OBJECT")
    print("PASS: names, topology, clean rerun, user additions/copies, external links/shared data, edit context, and isolated GLB export")


if __name__ == "__main__":
    main()
