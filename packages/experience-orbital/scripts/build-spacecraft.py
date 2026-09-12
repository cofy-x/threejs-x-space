"""Build the original Astra-02 probe in Blender and export a web-ready GLB.

Run with Blender 4.2 or newer:
    blender --background --python scripts/build-spacecraft.py -- --output src/assets/astra-probe.glb

The staged functions may also be called through Blender MCP. Only the named
Astra scene is rebuilt; objects in unrelated scenes are never cleared.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import subprocess
import sys
import tempfile

import bpy
from mathutils import Vector

SCENE_NAME = "Orbital - Astra 02"
PREFIX = "Astra_"


def xyz(point):
    """Author in runtime coordinates: +Z forward, +Y up; map to Blender Z-up."""
    return Vector((point[0], -point[2], point[1]))


def scene():
    return bpy.data.scenes[SCENE_NAME]


def activate():
    bpy.context.window.scene = scene()


def material(name):
    return bpy.data.materials[PREFIX + name]


def make_material(name, color, metal=0.0, rough=0.4, emission=0.0):
    mat = bpy.data.materials.get(PREFIX + name) or bpy.data.materials.new(PREFIX + name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, 1)
    shader = next(node for node in mat.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metal
    shader.inputs["Roughness"].default_value = rough
    shader.inputs["Emission Color"].default_value = (*color, 1)
    shader.inputs["Emission Strength"].default_value = emission
    return mat


def finish_object(obj, name, mat, bevel=0.0, smooth=False):
    obj.name = PREFIX + name
    obj["astra_owned"] = True
    obj["export_mesh"] = True
    obj.data.materials.append(material(mat))
    if bevel:
        modifier = obj.modifiers.new("Manufactured edge radius", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    if smooth:
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    elif bevel:
        modifier = obj.modifiers.new("Weighted corner normals", "WEIGHTED_NORMAL")
        modifier.keep_sharp = True
        modifier.weight = 30
    return obj


def box(name, position, dimensions, mat, bevel=0.01):
    bpy.ops.mesh.primitive_cube_add(size=1, location=xyz(position))
    obj = bpy.context.object
    obj.dimensions = (dimensions[0], dimensions[2], dimensions[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish_object(obj, name, mat, bevel)


def plate(name, position, width, depth, mat, corner=0.004):
    x, y, z = position
    hx, hz = width * .5, depth * .5
    c = min(corner, hx, hz)
    perimeter = [(-hx + c, -hz), (hx - c, -hz), (hx, -hz + c), (hx, hz - c),
                 (hx - c, hz), (-hx + c, hz), (-hx, hz - c), (-hx, -hz + c)]
    return mesh(name, [(x + px, y, z + pz) for px, pz in perimeter],
                [tuple(reversed(range(8)))], mat)


def rod(name, start, end, radius, mat, radius_end=None, vertices=16):
    a, b = xyz(start), xyz(end)
    direction = b - a
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius,
                                  radius2=radius if radius_end is None else radius_end,
                                  depth=direction.length, location=(a + b) * 0.5)
    obj = bpy.context.object
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    return finish_object(obj, name, mat, min(radius * 0.1, 0.008), True)


def ring(name, center, normal, radius, thickness, mat, segments=48):
    bpy.ops.mesh.primitive_torus_add(major_segments=segments, minor_segments=8,
                                   location=xyz(center), major_radius=radius,
                                   minor_radius=thickness)
    obj = bpy.context.object
    obj.rotation_euler = xyz(normal).to_track_quat("Z", "Y").to_euler()
    return finish_object(obj, name, mat, smooth=True)


def mesh(name, vertices, faces, mat, bevel=0.0, smooth=False):
    data = bpy.data.meshes.new(PREFIX + name)
    data.from_pydata([xyz(v) for v in vertices], [], faces)
    data.update()
    obj = bpy.data.objects.new(PREFIX + name, data)
    scene().collection.objects.link(obj)
    return finish_object(obj, name, mat, bevel, smooth)


def shell(name, profile, mat):
    # Each station is (forward position, half width, half height, vertical center).
    vertices = []
    for z, hx, hy, cy in profile:
        for x, y in [(hx * .67, hy), (-hx * .67, hy), (-hx, hy * .60),
                     (-hx, -hy * .60), (-hx * .67, -hy), (hx * .67, -hy),
                     (hx, -hy * .60), (hx, hy * .60)]:
            vertices.append((x, y + cy, z))
    faces = []
    for station in range(len(profile) - 1):
        for i in range(8):
            a, b = station * 8 + i, station * 8 + (i + 1) % 8
            faces.append((a, b, b + 8, a + 8))
    faces.extend([tuple(reversed(range(8))), tuple(range(len(vertices) - 8, len(vertices)))])
    obj = mesh(name, vertices, faces, mat, .018)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    obj.select_set(False)
    return obj


def nozzle(name, x, y, exit_z, radius):
    profile = [(exit_z + .26, radius * .50), (exit_z + .20, radius * .54),
               (exit_z + .11, radius * .74), (exit_z + .025, radius), (exit_z, radius),
               (exit_z, radius * .79), (exit_z + .08, radius * .63), (exit_z + .18, radius * .30)]
    vertices = []
    for z, r in profile:
        for i in range(40):
            angle = i / 40 * math.tau
            vertices.append((x + math.cos(angle) * r, y + math.sin(angle) * r, z))
    faces = [(j * 40 + i, j * 40 + (i + 1) % 40, (j + 1) * 40 + (i + 1) % 40, (j + 1) * 40 + i)
             for j in range(len(profile) - 1) for i in range(40)]
    mesh(name + " Bell", vertices, faces, "Graphite", smooth=True)
    ring(name + " Lip", (x, y, exit_z + .012), (0, 0, 1), radius * .97, .012, "Trim")
    ring(name + " Induction winding", (x, y, exit_z + .08), (0, 0, 1), radius * .76, .012, "Copper")
    rod(name + " Ion aperture", (x, y, exit_z + .16), (x, y, exit_z + .155), radius * .41, "Ion", vertices=32)
    for i in range(8):
        angle = i / 8 * math.tau
        r = radius * .85
        rod(name + " Cooling rib", (x + math.cos(angle) * r, y + math.sin(angle) * r, exit_z + .055),
            (x + math.cos(angle) * r * .62, y + math.sin(angle) * r * .62, exit_z + .19), .009, "Trim", vertices=8)


def create_core():
    current = bpy.data.scenes.get(SCENE_NAME)
    if current:
        for obj in list(current.objects):
            if obj.get("astra_owned"):
                bpy.data.objects.remove(obj, do_unlink=True)
    else:
        current = bpy.data.scenes.new(SCENE_NAME)
    activate()
    make_material("Hull", (.75, .81, .83), .18, .29)
    make_material("Graphite", (.022, .035, .050), .55, .34)
    make_material("Trim", (.34, .45, .50), .78, .24)
    make_material("Copper", (.54, .25, .075), .72, .3)
    make_material("Solar", (.014, .041, .082), .5, .27)
    make_material("SolarAlternate", (.025, .069, .116), .5, .29)
    make_material("Glass", (.005, .033, .049), .64, .16)
    make_material("Ion", (.055, .58, .82), .25, .24, 2.2)
    shell("Ceramic main hull", [(-.77, .28, .21, .02), (-.52, .38, .27, .02),
                               (.38, .32, .23, .04), (.84, .21, .16, .04),
                               (1.12, .12, .12, .04)], "Hull")
    shell("Ventral graphite keel", [(-.75, .22, .07, -.21), (.26, .24, .07, -.21),
                                    (.80, .12, .055, -.12)], "Graphite")
    box("Dorsal service spine", (0, .298, -.19), (.27, .065, .71), "Graphite", .025)
    box("Forward ceramic hatch", (0, .296, .285), (.29, .035, .27), "Hull", .015)
    for side in [-1, 1]:
        box("Thermal seam", (side * .30, .196, -.23), (.021, .024, .54), "Copper", .005)
        box("Flank service panel", (side * .368, .015, -.22), (.018, .23, .39), "Graphite", .012)
        for z in [-.36, -.27, -.18, -.09]:
            box("Flank radiator louver", (side * .379, .015, z), (.014, .175, .022), "Trim", .003)
        rod("Vector nacelle", (side * .47, -.02, -.69), (side * .47, -.02, -.20), .135, "Hull", .1, 24)
        rod("Nacelle mount", (side * .28, -.04, -.38), (side * .48, -.04, -.42), .062, "Graphite")
        nozzle("Vector engine", side * .47, -.02, -.91, .117)
        box("Nacelle ceramic stripe", (side * .47, .118, -.41), (.053, .012, .3), "Copper", .003)
    rod("Main engine throat", (0, 0, -.71), (0, 0, -.97), .15, "Graphite", .12, 32)
    nozzle("Main ion engine", 0, 0, -1.18, .225)
    rod("Sensor bezel", (0, .04, 1.105), (0, .04, 1.18), .104, "Graphite", .088, 32)
    rod("Optical aperture", (0, .04, 1.18), (0, .04, 1.191), .074, "Glass", vertices=32)
    ring("Optical collar", (0, .04, 1.184), (0, 0, 1), .081, .008, "Trim")
    rod("Optical depth glint", (.023, .063, 1.193), (.023, .063, 1.194), .016, "Ion", vertices=16)
    for side in [-1, 1]:
        box("Sensor side cheek", (side * .195, .045, .78), (.06, .08, .24), "Graphite", .017)
        box("Navigation light", (side * .219, .072, .84), (.011, .018, .08), "Ion", .004)
    return {"scene": current.name, "core_objects": len(current.objects)}


def add_wings():
    activate()
    for side in [-1, 1]:
        rod("Wing deployment shaft", (side * .31, .015, -.12), (side * .72, .015, -.12), .035, "Trim")
        rod("Wing hinge", (side * .65, .015, -.23), (side * .65, .015, -.01), .062, "Graphite")
        ring("Wing hinge collar", (side * .65, .015, -.055), (0, 0, 1), .063, .009, "Copper", 24)
        for panel, cx in enumerate([.945, 1.555]):
            cy, cz = .014 - panel * .048, -.13 - panel * .15
            x = side * cx
            box("Solar frame", (x, cy, cz), (.576, .045, .68), "Trim", .022)
            box("Solar substrate", (x, cy + .023, cz), (.55, .012, .654), "Graphite", .012)
            for col in range(6):
                for row in range(5):
                    px = x + (col - 2.5) * .087
                    pz = cz + (row - 2) * .122
                    plate("Photovoltaic cell", (px, cy + .038, pz), .080, .111,
                          "SolarAlternate" if (col + row + panel) % 5 == 0 else "Solar")
                    for offset in [-.022, .022]:
                        plate("Cell busbar", (px + offset, cy + .039, pz), .0018, .101, "Trim", 0.0)
            for dz in [-.28, .28]:
                box("Fold latch", (side * (cx - .272), cy + .044, cz + dz), (.035, .012, .055), "Copper", .004)
            rod("Wing lower brace", (side * .44, -.14, -.27), (side * (cx + .16), cy - .035, cz - .23), .012, "Graphite", vertices=8)
        for z in [-.35, .13]:
            box("Panel interconnect hinge", (side * 1.245, -.012, z - .1), (.075, .048, .07), "Graphite", .008)
        box("Wing tip locator", (side * 1.84, -.022, -.02), (.014, .013, .065), "Ion", .003)
    return {"objects_after_wings": len(scene().objects)}


def add_instruments():
    activate()
    rod("Dish mast", (0, .27, -.36), (0, .48, -.34), .035, "Trim")
    box("Antenna gimbal", (0, .445, -.31), (.17, .10, .15), "Graphite", .017)
    origin = Vector((0, .48, -.27))
    direction = Vector((0, .55, .835)).normalized()
    u = Vector((1, 0, 0))
    v = direction.cross(u).normalized()
    vertices = []
    radial_steps, segments = 8, 48
    for j in range(radial_steps + 1):
        r = .32 * j / radial_steps
        for i in range(segments):
            angle = i / segments * math.tau
            point = origin + u * (r * math.cos(angle)) + v * (r * math.sin(angle)) + direction * (.13 * (r / .32) ** 2)
            vertices.append(tuple(point))
    faces = [(j * segments + i, j * segments + (i + 1) % segments,
              (j + 1) * segments + (i + 1) % segments, (j + 1) * segments + i)
             for j in range(radial_steps) for i in range(segments)]
    dish = mesh("High gain antenna", vertices, faces, "Hull", smooth=True)
    solidify = dish.modifiers.new("Antenna shell thickness", "SOLIDIFY")
    solidify.thickness = .009
    ring("Dish lip", tuple(origin + direction * .13), tuple(direction), .321, .008, "Trim")
    feed = origin + direction * .29
    for i in range(3):
        angle = i * math.tau / 3
        rim_point = origin + u * (.285 * math.cos(angle)) + v * (.285 * math.sin(angle)) + direction * .11
        rod("Antenna feed strut", tuple(rim_point), tuple(feed), .0075, "Trim", vertices=8)
    rod("Antenna feed", tuple(feed), tuple(feed + direction * .038), .03, "Copper", .021)
    rod("Telemetry mast", (.25, .22, -.60), (.31, .64, -.64), .009, "Trim", vertices=8)
    rod("Telemetry cap", (.31, .64, -.64), (.31, .67, -.64), .018, "Graphite")
    for side in [-1, 1]:
        box("Ventral radiator", (side * .24, -.31, -.26), (.032, .19, .57), "Graphite", .01)
        for z in [-.46, -.37, -.28, -.19, -.1]:
            box("Radiator capillary", (side * .261, -.31, z), (.009, .17, .009), "Trim", .002)
        for z in [-.48, -.22, .03]:
            rod("Titanium hull fastener", (side * .233, .299, z), (side * .233, .309, z), .014, "Trim", vertices=6)
        box("Live status strip", (side * .111, .335, -.17), (.014, .006, .22), "Ion", .003)
        rod("RCS manifold", (side * .28, -.1, .31), (side * .40, -.1, .31), .027, "Graphite", .035)
        ring("RCS nozzle rim", (side * .40, -.1, .31), (side, 0, 0), .031, .004, "Trim", 24)
    for text, z, size in [("ASTRA", .23, .075), ("02", .41, .075)]:
        bpy.ops.object.text_add(location=xyz((0, .32 if z < .3 else .288, z)))
        obj = bpy.context.object
        obj.name = PREFIX + "Registry " + text
        obj.data.body = text
        obj.data.align_x = "CENTER"
        obj.data.align_y = "CENTER"
        obj.data.size = size
        obj.data.extrude = .0002
        obj.data.resolution_u = 2
        bpy.ops.object.convert(target="MESH")
        finish_object(bpy.context.object, "Registry " + text, "Graphite")
    return {"objects_after_instruments": len(scene().objects)}


def finalize(output):
    activate()
    bpy.ops.object.select_all(action="DESELECT")
    objects = [obj for obj in scene().objects if obj.get("export_mesh")]
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.convert(target="MESH")
    bpy.ops.object.join()
    model = bpy.context.object
    model.name = "AstraProbe"
    model["astra_owned"] = True
    model["export_mesh"] = True
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    model.data.validate()
    model.data.update()
    output = Path(output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", use_selection=True, use_active_scene=True,
                              export_texcoords=False, export_tangents=False,
                              export_yup=True, export_animations=False, export_cameras=False,
                              export_lights=False, export_extras=False, export_materials="EXPORT")
    model.data.calc_loop_triangles()
    report = {"file": output.name, "bytes": output.stat().st_size,
              "triangles": len(model.data.loop_triangles),
              "materials": len(set(slot.material.name for slot in model.material_slots if slot.material)),
              "runtime_dimensions": [round(model.dimensions.x, 4), round(model.dimensions.z, 4), round(model.dimensions.y, 4)],
              "forward": "+Z", "up": "+Y"}
    print(json.dumps(report, indent=2))
    return report


def save_editable_source(current, destination):
    """Write a normal one-scene .blend without changing or saving the open file."""
    destination = Path(destination).resolve()
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        prefix="astra-source-", suffix=".blend", dir=destination.parent, delete=False
    ) as temporary:
        library_path = Path(temporary.name)
    try:
        bpy.data.libraries.write(str(library_path), {current}, fake_user=True, compress=True)
        expression = (
            "import bpy; "
            f"bpy.context.window.scene = bpy.data.scenes[{SCENE_NAME!r}]; "
            f"bpy.ops.wm.save_as_mainfile(filepath={str(destination)!r}, compress=True)"
        )
        subprocess.run(
            [bpy.app.binary_path, "--background", "--factory-startup", str(library_path),
             "--python-expr", expression],
            check=True,
        )
    finally:
        library_path.unlink(missing_ok=True)


def studio(preview=None, blend=None):
    activate()
    current = scene()
    for obj in list(current.objects):
        if obj.get("astra_owned") and not obj.get("export_mesh"):
            bpy.data.objects.remove(obj, do_unlink=True)
    world = bpy.data.worlds.get(PREFIX + "World") or bpy.data.worlds.new(PREFIX + "World")
    world.use_nodes = True
    next(node for node in world.node_tree.nodes if node.type == "BACKGROUND").inputs[0].default_value = (.025, .04, .07, 1)
    next(node for node in world.node_tree.nodes if node.type == "BACKGROUND").inputs[1].default_value = .45
    current.world = world
    for name, location, energy, color, size in [
        ("Key", (1.3, -3.2, 5), 600, (1, .91, .77), 4),
        ("Fill", (-3, -1, 2), 450, (.47, .71, 1), 3),
        ("Rim", (2, 3, 3), 850, (.68, .87, 1), 2.5),
    ]:
        data = bpy.data.lights.new(PREFIX + name, "AREA")
        data.energy, data.color, data.shape, data.size = energy, color, "DISK", size
        obj = bpy.data.objects.new(PREFIX + name, data)
        current.collection.objects.link(obj)
        obj.location = location
        obj.rotation_euler = (-obj.location).to_track_quat("-Z", "Y").to_euler()
        obj["astra_owned"] = True
    camera_data = bpy.data.cameras.new(PREFIX + "Camera")
    camera = bpy.data.objects.new(PREFIX + "Camera", camera_data)
    current.collection.objects.link(camera)
    camera.location = (3.6, -5.5, 3.8)
    camera.rotation_euler = (Vector((0, 0, .04)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 4.65
    camera["astra_owned"] = True
    current.camera = camera
    current.render.engine = "BLENDER_EEVEE"
    current.render.resolution_x, current.render.resolution_y = 1440, 1080
    current.render.resolution_percentage = 100
    current.render.image_settings.file_format = "PNG"
    current.render.film_transparent = False
    current.view_settings.view_transform = "AgX"
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == "VIEW_3D":
                area.spaces.active.region_3d.view_perspective = "CAMERA"
                area.spaces.active.shading.type = "MATERIAL"
    if blend:
        # Normalize the isolated scene in another Blender process so the open file and
        # unrelated scenes remain untouched while the archive opens as a normal project.
        save_editable_source(current, blend)
    if preview:
        current.render.filepath = str(Path(preview).resolve())
        bpy.ops.render.render(write_still=True)
    return {"scene": current.name, "camera": camera.name}


def main():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "src/assets/astra-probe.glb")
    parser.add_argument("--preview", type=Path)
    parser.add_argument("--blend", type=Path)
    options = parser.parse_args(args)
    create_core()
    add_wings()
    add_instruments()
    if options.blend:
        # Preserve separate editable parts and modifiers before the runtime merge.
        studio(blend=options.blend)
    finalize(options.output)
    if options.preview:
        studio(preview=options.preview)


if __name__ == "__main__":
    main()
