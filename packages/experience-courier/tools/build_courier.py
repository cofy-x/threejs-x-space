"""Build the original courier in a separate Blender scene; export an optimized GLB.
Run in Blender with COURIER_OUTPUT set to an absolute output filename.
The current scene and its objects are preserved.
"""
import bpy
import math
import os
from mathutils import Vector

output = os.environ.get('COURIER_OUTPUT')
if not output:
    raise RuntimeError('Set COURIER_OUTPUT to the destination GLB path')
created_materials = []
previous = bpy.context.window.scene
scene = bpy.data.scenes.new('Clockwork Courier Asset')
bpy.context.window.scene = scene

try:
    def material(name, color, metal=0, rough=.4, emission=0):
        mat = bpy.data.materials.new('Courier_' + name)
        created_materials.append(mat)
        mat.diffuse_color = (*color, 1)
        mat.use_nodes = True
        bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        bsdf.inputs['Base Color'].default_value = (*color, 1)
        bsdf.inputs['Metallic'].default_value = metal
        bsdf.inputs['Roughness'].default_value = rough
        if emission:
            bsdf.inputs['Emission Color'].default_value = (*color, 1)
            bsdf.inputs['Emission Strength'].default_value = emission
        return mat

    cream = material('Porcelain', (.89, .82, .64), .18, .3)
    orange = material('PostalOrange', (.8, .19, .045), .15)
    ink = material('MidnightEnamel', (.035, .075, .075), .28)
    brass = material('Brass', (.57, .32, .1), .7, .3)
    rubber = material('Rubber', (.028, .039, .039), .05, .8)
    eye = material('Eyes', (.4, .95, .84), .1, .2, 2)
    parts = {}

    def bucket(name):
        parts[name] = []
        return name

    def finish(obj, mat, name):
        obj.data.materials.append(mat)
        parts[name].append(obj)
        return obj

    def box(name, loc, size, mat, bevel=.04):
        bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
        obj = bpy.context.object
        obj.dimensions = size
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        if bevel:
            mod = obj.modifiers.new('Soft manufactured edges', 'BEVEL')
            mod.width = bevel
            mod.segments = 3
            bpy.ops.object.modifier_apply(modifier=mod.name)
            mod = obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
            bpy.ops.object.modifier_apply(modifier=mod.name)
        return finish(obj, mat, name)

    def cylinder(name, loc, radius, depth, mat, rotation=(0, 0, 0)):
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=radius, depth=depth, location=loc, rotation=rotation)
        obj = bpy.context.object
        mod = obj.modifiers.new('Machined rim', 'BEVEL')
        mod.width = .015
        mod.segments = 2
        bpy.ops.object.modifier_apply(modifier=mod.name)
        for p in obj.data.polygons:
            p.use_smooth = len(p.vertices) == 4
        return finish(obj, mat, name)

    body = bucket('Body')
    box(body, (0, 0, .56), (.52, .34, .43), cream, .085)
    box(body, (0, -.183, .57), (.32, .045, .24), orange, .025)
    box(body, (0, -.212, .57), (.2, .012, .125), cream, .008)
    # A little envelope badge, with two dark diagonal seams.
    for side in (-1, 1):
        obj = box(body, (side*.043, -.222, .587), (.1, .008, .012), brass, .002)
        obj.rotation_euler.y = side * -.48
    box(body, (0, .23, .6), (.39, .19, .4), orange, .055)
    for x in (-.125, .125):
        box(body, (x, .33, .6), (.035, .025, .35), brass, .008)
    box(body, (0, .23, .81), (.18, .09, .04), ink, .015)
    cylinder(body, (0, 0, .81), .12, .09, brass)
    head = bucket('Head')
    box(head, (0, -.01, 1), (.63, .4, .36), cream, .105)
    box(head, (0, -.204, 1.015), (.51, .047, .19), ink, .065)
    for x in (-.13, .13):
        box(head, (x, -.231, 1.025), (.068, .014, .073), eye, .029)
    box(head, (0, -.218, .886), (.12, .014, .014), brass, .005)
    box(head, (0, -.02, 1.19), (.32, .27, .04), orange, .02)
    cylinder(head, (.22, .06, 1.27), .016, .17, brass)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=.047, location=(.22, .06, 1.365))
    finish(bpy.context.object, orange, head)
    for side in (-1, 1):
        cylinder(head, (side*.318, 0, 1), .077, .037, brass, (0, math.pi/2, 0))
        arm = bucket('ArmL' if side < 0 else 'ArmR')
        cylinder(arm, (side*.305, 0, .69), .074, .09, brass, (0, math.pi/2, 0))
        box(arm, (side*.35, -.01, .53), (.12, .16, .26), cream, .048)
        cylinder(arm, (side*.35, -.025, .365), .06, .08, ink)
        box(arm, (side*.35, -.03, .30), (.135, .14, .08), brass, .027)
        leg = bucket('LegL' if side < 0 else 'LegR')
        cylinder(leg, (side*.155, 0, .31), .074, .12, ink)
        box(leg, (side*.155, 0, .20), (.15, .17, .2), cream, .035)
        box(leg, (side*.155, -.045, .067), (.21, .29, .13), rubber, .043)
        box(leg, (side*.155, -.086, .13), (.20, .2, .06), orange, .025)

    # Join by articulating part, keeping each material slot, to reduce object overhead.
    for name, objects in parts.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
        obj = bpy.context.object
        obj.name = name
        obj.data.name = name + "Mesh"
        pivot = (0, 0, 0)
        if name == 'Head': pivot = (0, 0, .82)
        if name.startswith('Arm'): pivot = (-.30 if name == 'ArmL' else .30, 0, .69)
        if name.startswith('Leg'): pivot = (-.155 if name == 'LegL' else .155, 0, .32)
        scene.cursor.location = pivot
        bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    bpy.ops.object.select_all(action='SELECT')
    os.makedirs(os.path.dirname(output), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=output, export_format='GLB', use_selection=True, use_active_scene=True, export_yup=True, export_apply=True, export_cameras=False, export_lights=False)
    print('Courier exported:', output)
finally:
    bpy.context.window.scene = previous
    for obj in list(scene.objects):
        data = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        if data and data.users == 0:
            bpy.data.meshes.remove(data)
    bpy.data.scenes.remove(scene)
    for mat in created_materials:
        if mat.users == 0:
            bpy.data.materials.remove(mat)
