"""Create an isolated Blender study of the runtime fan airfoil, without third-party assets.

Run from the repository root:
blender --python packages/experience-turbofan/scripts/build-blade-study.py
Optional export: append -- --output <preview-path>.glb
The Three.js scene generates the same section directly; this GLB is an authoring preview only.
Select the generated study scene to inspect it. The active scene, mode, and selection are retained.
Reruns replace owned, unshared, unselected data and preserve user additions and external links.
"""

import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.geometry import tessellate_polygon
SCENE_NAME = "Turbofan Airfoil Study"
COLLECTION_NAME = "Turbofan Procedural Study"
OWNER_KEY = "threejs_x_space_generator"
OWNER_VALUE = "turbofan_airfoil_study_v1"
ROLE_KEY = "threejs_x_space_role"
OBJECTS_KEY = "threejs_x_space_generated_objects"
TAU = math.tau


def owned(data, role=None):
    return data.get(OWNER_KEY) == OWNER_VALUE and (role is None or data.get(ROLE_KEY) == role)


def mark(data, role):
    data[OWNER_KEY] = OWNER_VALUE
    data[ROLE_KEY] = role
    return data


def build_airfoil(hub_radius=0.42, span=1.055, chord=0.54, sweep=0.26, twist=0.65, span_steps=16):
    """Match airfoilGeometry in src/components/three/airfoil-geometry.ts."""
    contour_steps = 32
    vertices = []
    faces = []
    for row in range(span_steps + 1):
        t = row / span_steps
        width = chord * (0.72 + 0.43 * math.sin(t * math.pi * 0.65))
        pitch = 0.38 + twist * t
        for step in range(contour_steps):
            angle = step / contour_steps * TAU
            u = (1 - math.cos(angle)) / 2
            thickness = 5 * (0.1 - 0.052 * t) * width * (
                0.2969 * math.sqrt(u) - 0.126 * u - 0.3516 * u**2
                + 0.2843 * u**3 - 0.1036 * u**4
            ) * (1 if step < contour_steps / 2 else -1)
            camber = width * 0.075 * math.sin(math.pi * u)
            across = (u - 0.46) * width
            height = camber + thickness
            tangential = across * math.sin(pitch) + height * math.cos(pitch) + sweep * t**1.7
            radius = hub_radius + span * t
            vertices.append((
                across * math.cos(pitch) - height * math.sin(pitch) + sweep * 0.65 * t**1.8,
                math.sqrt(max(0, radius**2 - tangential**2)),
                tangential,
            ))
    for row in range(span_steps):
        for step in range(contour_steps):
            a = row * contour_steps + step
            b = row * contour_steps + (step + 1) % contour_steps
            faces.extend([(a, b, a + contour_steps), (b, b + contour_steps, a + contour_steps)])
    # The cambered section is concave. A triangle fan crosses outside its perimeter.
    # Match the runtime's X/Z contour triangulation and point caps radially outward.
    for offset, tip in [(0, False), (span_steps * contour_steps, True)]:
        cap_vertices = vertices[offset:offset + contour_steps]
        cap_offset = len(vertices)
        vertices.extend(cap_vertices)
        contour = [Vector((x, z, 0)) for x, _y, z in cap_vertices]
        lookup = {tuple(point): index for index, point in enumerate(contour)}
        for triangle in tessellate_polygon([contour]):
            # Blender versions return either source indices or contour vectors.
            a, b, c = [point if isinstance(point, int) else lookup[tuple(point)] for point in triangle]
            pa, pb, pc = contour[a], contour[b], contour[c]
            area = (pb.x - pa.x) * (pc.y - pa.y) - (pb.y - pa.y) * (pc.x - pa.x)
            if (tip and area > 0) or (not tip and area < 0):
                b, c = c, b
            faces.append((cap_offset + a, cap_offset + b, cap_offset + c))
    mesh = mark(bpy.data.meshes.new("Turbofan Swept Airfoil"), "mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return mesh


def material(name, color, metalness, roughness):
    # Never rewrite a material reused by another scene, even if its name matches.
    mat = mark(bpy.data.materials.new(name), "material")
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = next(node for node in mat.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metalness
    shader.inputs["Roughness"].default_value = roughness
    return mat


def retire_collection(scene, collection, protected_objects):
    """Replace only this scene's unshared generated content, retaining user additions."""
    if collection.users > 1:
        # Another scene, collection, or instance still uses the whole generation.
        scene.collection.children.unlink(collection)
        return

    # Explicit ID references distinguish generated objects from user-created copies,
    # which can inherit the same custom properties when duplicated in Blender.
    generated_objects = list(collection.get(OBJECTS_KEY, {}).values())
    if OBJECTS_KEY in collection:
        del collection[OBJECTS_KEY]
    data_to_check = {}
    materials_to_check = {}
    for obj in generated_objects:
        if obj is None or not owned(obj, "object") or collection.objects.get(obj.name) != obj:
            continue
        if obj.as_pointer() in protected_objects:
            # An active/selected study object may be in Edit Mode; retain the user's work.
            continue
        if obj.users > 1 or len(obj.users_collection) > 1:
            # Unlink the study's copy; keep the same object available to its external users.
            collection.objects.unlink(obj)
            if not obj.users_collection:
                scene.collection.objects.link(obj)
            continue
        data = obj.data
        if data and owned(data):
            data_to_check[data.as_pointer()] = data
            if isinstance(data, bpy.types.Mesh):
                for mat in data.materials:
                    if mat and owned(mat, "material"):
                        materials_to_check[mat.as_pointer()] = mat
        bpy.data.objects.remove(obj, do_unlink=True)

    for data in data_to_check.values():
        if data.users:
            continue
        if isinstance(data, bpy.types.Mesh):
            bpy.data.meshes.remove(data)
        elif isinstance(data, bpy.types.Camera):
            bpy.data.cameras.remove(data)
        elif isinstance(data, bpy.types.Light):
            bpy.data.lights.remove(data)
    for mat in materials_to_check.values():
        if mat.users == 0:
            bpy.data.materials.remove(mat)

    if not collection.objects and not collection.children:
        bpy.data.collections.remove(collection)
    else:
        # The remaining objects/subcollections belong to the user; do not revisit them.
        collection[ROLE_KEY] = "preserved_collection"


def build_study():
    protected_objects = {obj.as_pointer() for obj in bpy.context.selected_objects}
    if bpy.context.active_object:
        protected_objects.add(bpy.context.active_object.as_pointer())
    scene = next((item for item in bpy.data.scenes if owned(item, "scene")), None)
    if scene is None:
        scene = mark(bpy.data.scenes.new(SCENE_NAME), "scene")
    if scene.camera and owned(scene.camera, "object"):
        scene.camera = None
    for previous in list(scene.collection.children):
        if owned(previous, "generated_collection"):
            retire_collection(scene, previous, protected_objects)
    collection = mark(bpy.data.collections.new(COLLECTION_NAME), "generated_collection")
    scene.collection.children.link(collection)

    blade = build_airfoil()
    blade.materials.append(material("Turbofan Study Titanium", (0.57, 0.66, 0.71), 0.87, 0.26))
    for i in range(24):
        obj = mark(bpy.data.objects.new(f"Fan airfoil {i + 1:02}", blade), "object")
        obj.rotation_euler.x = i / 24 * TAU
        collection.objects.link(obj)

    # Keep the geometry axes identical to the browser: X is the engine axis and Y is up.
    camera_data = mark(bpy.data.cameras.new("Turbofan Study Camera"), "camera")
    camera = mark(bpy.data.objects.new("Turbofan Study Camera", camera_data), "object")
    camera.location = (-4.3, 1.8, 3.1)
    camera.rotation_euler = (-camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 3.9
    collection.objects.link(camera)
    scene.camera = camera
    for name, location, energy, size in [
        ("Key", (-3, 4, 3), 850, 5),
        ("Rim", (2, 2, -3), 1100, 4),
        ("Fill", (-2, -3, 1), 500, 3),
    ]:
        data = mark(bpy.data.lights.new(f"Turbofan Study {name}", "AREA"), "light")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        light = mark(bpy.data.objects.new(f"Turbofan Study {name}", data), "object")
        light.location = location
        light.rotation_euler = (-light.location).to_track_quat("-Z", "Y").to_euler()
        collection.objects.link(light)
    previous_world = scene.world
    world = mark(bpy.data.worlds.new("Turbofan Study World"), "world")
    world.use_nodes = True
    next(node for node in world.node_tree.nodes if node.type == "BACKGROUND").inputs[0].default_value = (0.025, 0.035, 0.045, 1)
    next(node for node in world.node_tree.nodes if node.type == "BACKGROUND").inputs[1].default_value = 0.4
    scene.world = world
    if previous_world and owned(previous_world, "world") and previous_world.users == 0:
        bpy.data.worlds.remove(previous_world)
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 32
    scene.render.resolution_x = 960
    scene.render.resolution_y = 960
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = "AgX"
    collection[OBJECTS_KEY] = {str(index): obj for index, obj in enumerate(collection.objects)}
    print(f"Built {scene.name}: 24 linked airfoils; {len(blade.vertices)} vertices and {len(blade.polygons)} triangles per source blade. Select this scene to inspect it.")
    return scene, collection


def export_preview(scene, collection, output):
    """Export only the new generation without changing the user's active object or mode."""
    output = Path(output)
    if output.suffix.lower() != ".glb":
        raise ValueError("The optional export must use a .glb extension")
    output.parent.mkdir(parents=True, exist_ok=True)
    with bpy.context.temp_override(scene=scene, view_layer=scene.view_layers[0], active_object=None, object=None):
        result = bpy.ops.export_scene.gltf(
            filepath=str(output.resolve()), export_format="GLB", collection=collection.name,
            use_active_scene=True, export_cameras=False, export_lights=False,
            export_animations=False, export_current_frame=True,
        )
    if "FINISHED" not in result:
        raise RuntimeError(f"GLB export did not finish: {result}")
    print(f"Exported authoring preview: {output.name}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, help="Optional GLB preview export; not loaded by the website")
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    args = parser.parse_args(argv)
    if args.output and args.output.suffix.lower() != ".glb":
        parser.error("The optional export must use a .glb extension")
    scene, collection = build_study()
    if args.output:
        export_preview(scene, collection, args.output)


if __name__ == "__main__":
    main()
