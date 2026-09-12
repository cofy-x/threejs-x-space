"""Sculpt and export the original octopus mantle used by the cube experience.

Run through Blender MCP or Blender's Python interpreter. OCTO_STAGE=blockout
omits skin microdetail for silhouette review. OCTO_OUTPUT overrides the GLB path.
The character is authored Y-up and faces +Z. All non-Octo scenes are preserved.

Quality contract: one continuous pear-shaped mantle and eye saddle; integrated
fleshy eyelids; amber irises with horizontal pupils; layered chromatophore
mottling and skin papillae; a scalloped skirt for eight runtime-built arms.
This is an original stylized creature, not a reconstruction of a specific asset.
"""

import bpy
import bmesh
import math
import os
from pathlib import Path
from mathutils import Vector
from mathutils.noise import noise_vector


STAGE = globals().get("OCTO_STAGE", os.environ.get("OCTO_STAGE", "final"))
SCENE_NAME = "Octo Character Studio"
previous = bpy.data.scenes.get(SCENE_NAME)
if previous:
    old_meshes = [o.data for o in previous.objects if o.type == "MESH"]
    for obj in list(previous.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.scenes.remove(previous)
    for data in old_meshes:
        if data.users == 0:
            bpy.data.meshes.remove(data)
for mat in list(bpy.data.materials):
    if mat.name.startswith("Octo |") and mat.users == 0:
        bpy.data.materials.remove(mat)
for image in list(bpy.data.images):
    if image.name.startswith("Octo skin") and image.users == 0:
        bpy.data.images.remove(image)
scene = bpy.data.scenes.new(SCENE_NAME)
bpy.context.window.scene = scene


def bvec(point):
    return Vector((point[0], -point[2], point[1]))


def empty(name, position=(0, 0, 0), parent=None):
    obj = bpy.data.objects.new(name, None)
    scene.collection.objects.link(obj)
    obj.location = bvec(position)
    obj.parent = parent
    return obj


root = empty("Octo")
mantle = empty("OctoMantle", (0, 1.25, 0), root)


def material(name, color, roughness=.36, coat=.18, colored=False):
    mat = bpy.data.materials.new("Octo | " + name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    mat.use_backface_culling = True
    shader = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = 0
    shader.inputs["Coat Weight"].default_value = coat
    shader.inputs["Coat Roughness"].default_value = .19
    if colored:
        node = mat.node_tree.nodes.new("ShaderNodeVertexColor")
        node.layer_name = "Pigment"
        mat.node_tree.links.new(node.outputs["Color"], shader.inputs["Base Color"])
    return mat, shader


skin, skin_shader = material("coral chromatophores", (1, 1, 1), .39, .28, True)
iris_mat, _ = material("golden iris", (1, 1, 1), .25, .62, True)
eyeball_mat, _ = material("ochre eye globe", (.34, .20, .069), .23, .5)
pupil_mat, _ = material("horizontal obsidian pupil", (.003, .007, .009), .105, .8)
glint_mat, _ = material("corneal reflection", (.92, .89, .72), .08, .7)


def noise(point, scale=1, offset=0):
    return noise_vector(Vector((point[0] * scale + offset,
                                point[1] * scale + offset * .47,
                                point[2] * scale - offset * .28))).x


def mix(a, b, t):
    t = max(0, min(1, t))
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def pigment(point):
    x, y, z = point
    coral = (.572, .135, .076)
    if STAGE == "blockout":
        return coral
    broad = noise(point, 3.7, 13)
    fleck = noise(point, 29.5, 29)
    cell = noise(point, 63, 4)
    warm = mix((.485,.08,.048), (.737,.235,.12), .37 + broad*.14)
    mottled = mix(warm, (.42,.079,.065), max(0,noise(point,9.1,7)-.16)*.38)
    mottled = mix(mottled, (.82,.32,.19), max(0,fleck-.26)*.38)
    mottled = mix(mottled, (.42,.07,.053), max(0,cell-.24)*.27)
    # Violet at the skirt and the mantle's shaded lower flank.
    violet = max(0, min(.73, (.94 - y) * 1.8))
    violet *= .72 + .28 * math.sin(x * 4 + z * 2)
    return mix(mottled, (.267,.132,.242), violet)


def mesh(name, vertices, faces, mat=skin, parent=mantle, colors=None, uvs=None):
    data = bpy.data.meshes.new(name)
    data.from_pydata([bvec(p) for p in vertices], [], faces)
    data.materials.append(mat)
    data.update()
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.parent = parent
    for polygon in data.polygons:
        polygon.use_smooth = True
    if colors is not None:
        layer = data.color_attributes.new(name="Pigment", type="BYTE_COLOR", domain="POINT")
        for i, color in enumerate(colors):
            layer.data[i].color = (*color, 1)
    if uvs is not None:
        layer = data.uv_layers.new(name="SkinUV")
        for loop in data.loops:
            layer.data[loop.index].uv = uvs[loop.vertex_index]
    return obj


profile = [(.61, .405, .31, -.02), (.73, .44, .355, -.025),
           (.91, .43, .351, -.025), (1.12, .494, .406, -.045),
           (1.34, .579, .476, -.09), (1.52, .627, .535, -.15),
           (1.72, .654, .599, -.21), (1.92, .602, .596, -.273),
           (2.10, .461, .499, -.3), (2.23, .26, .328, -.289),
           (2.30, .001, .001, -.26)]


def shape(y):
    if y >= 2.23:
        crown=math.sqrt(max(0, (2.30-y)/.07))
        return .26*crown, .328*crown, -.26-.029*crown
    index = 0
    while index < len(profile) - 2 and profile[index + 1][0] < y:
        index += 1
    a, b, c, d = [profile[max(0, min(len(profile) - 1, k))] for k in (index - 1, index, index + 1, index + 2)]
    t = (y - b[0]) / max(.001, c[0] - b[0])
    return tuple(.5 * ((2*b[j]) + (-a[j]+c[j])*t + (2*a[j]-5*b[j]+4*c[j]-d[j])*t*t + (-a[j]+3*b[j]-3*c[j]+d[j])*t*t*t) for j in (1, 2, 3))


def surface(theta, y):
    rx, rz, center_z = shape(y)
    # Two broad orbital mounds remain part of the same continuous surface.
    mound = 0
    for eye_angle in (.84, math.pi - .84):
        delta = math.atan2(math.sin(theta-eye_angle), math.cos(theta-eye_angle))
        mound += .092 * math.exp(-((y-1.45)/.205)**2 - (delta/.32)**2)
    scallop = .026 * math.cos(8*theta) * math.exp(-((y-.66)/.16)**2)
    x = (rx + mound + scallop) * math.cos(theta)
    z = center_z + (rz + mound + scallop) * math.sin(theta)
    point = (x, y, z)
    if STAGE != "blockout":
        # Mesoscopic relief is actual geometry; the normal map adds finer pores.
        papilla = max(0, noise(point, 30, 8) - .24) ** 2 * .017
        undulation = noise(point, 7.1, 3) * .0025
        radius = papilla + undulation
        x += math.cos(theta) * radius
        z += math.sin(theta) * radius
    return Vector((x, y, z))


segments, rows = (128, 100) if STAGE == "blockout" else (160, 120)
vertices, colors, uvs, faces = [], [], [], []
for row in range(rows + 1):
    y = .61 + (2.30 - .61) * row / rows
    for column in range(segments + 1):
        theta = math.tau * column / segments
        point = surface(theta, y)
        vertices.append((point.x, point.y - 1.25, point.z))
        colors.append(pigment(point))
        uvs.append((column / segments, row / rows))
for row in range(rows):
    for column in range(segments):
        a = row * (segments + 1) + column
        faces.append((a, a + 1, a + segments + 2, a + segments + 1))
faces += [tuple(reversed(range(segments + 1))), tuple(rows * (segments + 1) + i for i in range(segments + 1))]
body = mesh("Continuous mantle and orbital saddle", vertices, faces, colors=colors, uvs=uvs)


def basis(side):
    normal = Vector((side * .3, .025, .954)).normalized()
    right = Vector((normal.z, 0, -normal.x)).normalized()
    up = normal.cross(right).normalized()
    return right, up, normal


def globe(name, radius, scale, mat, parent, center=(0, 0, 0), sides=48, rings=24, axes=None):
    verts, faces = [], []
    for row in range(rings + 1):
        phi = row * math.pi / rings
        for column in range(sides):
            theta = column * math.tau / sides
            p = Vector((radius * math.sin(phi)*math.cos(theta)*scale[0],
                        radius * math.cos(phi)*scale[1],
                        radius * math.sin(phi)*math.sin(theta)*scale[2]))
            if axes:
                p = axes[0]*p.x + axes[1]*p.y + axes[2]*p.z
            verts.append(tuple(p + Vector(center)))
    for row in range(rings):
        for column in range(sides):
            a = row * sides + column
            b = row * sides + (column+1) % sides
            faces.append((a,b,b+sides,a+sides))
    return mesh(name, verts, faces, mat, parent)


for side, name in [(-1, "EyeLeft"), (1, "EyeRight")]:
    center = Vector((side * .445, 1.47, .28))
    eye = empty(name, (center.x, center.y-1.25, center.z), mantle)
    right, up, normal = basis(side)
    globe("Embedded ochre eye globe", .178, (1, .86, .91), eyeball_mat, eye, axes=(right,up,normal))

    # Layered skin grows from an almond opening back into the continuous mantle.
    verts, faces, cols, coords = [], [], [], []
    sectors, lid_rows = 80, 12
    for row in range(lid_rows + 1):
        t = row / lid_rows
        for col in range(sectors + 1):
            a = math.tau * col / sectors
            upper = max(0, math.sin(a))
            rx = .157 + .074*t
            ry = .080 + .122*t
            inner_depth=.162*math.sqrt(max(0,1-(.157*math.cos(a)/.178)**2-(.080*math.sin(a)/.153)**2))+.012
            depth = inner_depth-(inner_depth+.14)*(t**2.6)
            depth += .033 * math.sin(math.pi*t) * upper
            local = right * (math.cos(a)*rx) + up * (math.sin(a)*ry) + normal*depth
            point = center + local
            verts.append((point.x, point.y-1.25, point.z))
            cols.append(pigment(point))
            coords.append(((math.atan2(point.z+.13, point.x) % math.tau)/math.tau, (point.y-.61)/1.69))
    for row in range(lid_rows):
        for col in range(sectors):
            a = row*(sectors+1)+col
            faces.append((a,a+1,a+sectors+2,a+sectors+1))
    front_count = len(verts)
    verts += [tuple(Vector(p) - normal*.054) for p in verts]
    cols += cols[:]
    coords += coords[:]
    faces += [tuple(i+front_count for i in reversed(face)) for face in faces[:]]
    for ring in (0, lid_rows):
        for col in range(sectors):
            a = ring*(sectors+1)+col
            b = a+1
            faces.append((a,b,b+front_count,a+front_count))
    mesh("Integrated almond eyelid", verts, faces, colors=cols, uvs=coords)

    # A radially striated amber iris covers the eye's forward cap.
    verts, faces, cols = [], [], []
    radial_rows, sides = 12, 96
    for row in range(radial_rows+1):
        r = .145 * row/radial_rows
        for column in range(sides):
            a = column*math.tau/sides
            micro = .0012*math.sin(a*43 + row*.57) * math.sin(math.pi*row/radial_rows)
            p = right*(math.cos(a)*r) + up*(math.sin(a)*r*.88) + normal*(.164 - .071*(r/.145)**2 + micro)
            verts.append(tuple(p))
            spoke = .5 + .5*math.sin(a*37 + math.sin(a*9)*1.7 + row*.21)
            color = mix((.32,.16,.027), (.96,.61,.15), .39 + spoke*.51)
            edge = max(0, (r/.145-.85)/.15)
            cols.append(mix(color, (.17,.084,.016), edge*.79))
    for row in range(radial_rows):
        for column in range(sides):
            a = row*sides+column
            b = row*sides+(column+1)%sides
            faces.append((a,b,b+sides,a+sides))
    mesh("Radially striated amber iris", verts, faces, iris_mat, eye, cols)

    # The pupil is an organic horizontal slit, never a round cartoon button.
    verts = [tuple(normal*.17)]
    count = 80
    for i in range(count):
        angle = i*math.tau/count
        xx = math.cos(angle)*.102
        yy = math.sin(angle)*.032*(.87 + .13*math.cos(2*angle))
        p = right*xx + up*yy + normal*(.168-.028*(xx/.102)**2)
        verts.append(tuple(p))
    faces = [(0, i+1, (i+1)%count+1) for i in range(count)]
    mesh("Horizontal pupil", verts, faces, pupil_mat, eye)
    # Small, restrained corneal flecks supplement physically rendered highlights.
    if STAGE != "blockout":
        glint = right*(-.036) + up*.034 + normal*.169
        globe("Corneal glint", .009, (1.6, .6, .25), glint_mat, eye, tuple(glint), 16, 8)


def micro_normal():
    import numpy as np
    size = 512
    rng = np.random.default_rng(2411)
    xx, yy = np.meshgrid(np.arange(size)/size, np.arange(size)/size)

    def value_noise(frequency):
        grid = rng.random((frequency, frequency)).astype(np.float32)
        x = xx*frequency
        y = yy*frequency
        ix, iy = np.floor(x).astype(int), np.floor(y).astype(int)
        fx, fy = x-ix, y-iy
        fx, fy = fx*fx*(3-2*fx), fy*fy*(3-2*fy)
        a = grid[iy%frequency, ix%frequency]
        b = grid[iy%frequency, (ix+1)%frequency]
        c = grid[(iy+1)%frequency, ix%frequency]
        d = grid[(iy+1)%frequency, (ix+1)%frequency]
        return (a*(1-fx)+b*fx)*(1-fy) + (c*(1-fx)+d*fx)*fy

    broad = value_noise(83)
    fine = value_noise(173)
    pores = value_noise(251)
    height = np.maximum(0, broad-.39)**1.45*.55 + fine*.10 + pores*.035
    dx = np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)
    dy = np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)
    normals = np.stack((-dx*1.8, -dy*1.8, np.ones_like(dx)), axis=-1)
    normals /= np.linalg.norm(normals, axis=-1, keepdims=True)
    pixels = np.ones((size,size,4), dtype=np.float32)
    pixels[:,:,:3] = normals*.5+.5
    image = bpy.data.images.new("Octo skin micro relief", width=size, height=size, alpha=False)
    image.colorspace_settings.name = "Non-Color"
    image.pixels.foreach_set(pixels.reshape(-1))
    image.pack()
    texture = skin.node_tree.nodes.new("ShaderNodeTexImage")
    texture.image = image
    mapping = skin.node_tree.nodes.new("ShaderNodeNormalMap")
    mapping.inputs["Strength"].default_value = .28
    skin.node_tree.links.new(texture.outputs["Color"], mapping.inputs["Color"])
    skin.node_tree.links.new(mapping.outputs["Normal"], skin_shader.inputs["Normal"])


if STAGE != "blockout":
    micro_normal()

# Recalculate closed surfaces without turning the forward iris or eyelids inward.
for obj in list(scene.objects):
    if obj.type != "MESH":
        continue
    data = bmesh.new()
    data.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(data, faces=list(data.faces))
    if any(word in obj.name for word in ("iris", "pupil")):
        for face in data.faces:
            if face.normal.y > 0:
                face.normal_flip()
    data.to_mesh(obj.data)
    data.free()

# Fuse the orbital flesh into the mantle so no independent sleeves or spheres
# remain in the skin silhouette. Reproject pigment and UVs after voxel sculpting.
bpy.ops.object.select_all(action="DESELECT")
skin_parts = [o for o in scene.objects if o.type=="MESH" and o.parent==mantle]
for obj in skin_parts:
    obj.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
body.data.remesh_voxel_size = .0125
bpy.ops.object.voxel_remesh()
smooth = body.modifiers.new("Sculpted skin transitions", "SMOOTH")
smooth.factor = .55
smooth.iterations = 4
bpy.ops.object.modifier_apply(modifier=smooth.name)
decimate = body.modifiers.new("Realtime sculpt topology", "DECIMATE")
decimate.ratio = .38
bpy.ops.object.modifier_apply(modifier=decimate.name)
for face in body.data.polygons:
    face.use_smooth=True
for layer in list(body.data.color_attributes):
    body.data.color_attributes.remove(layer)
pigment_layer = body.data.color_attributes.new(name="Pigment",type="BYTE_COLOR",domain="POINT")
for vertex in body.data.vertices:
    local = vertex.co
    point = Vector((local.x, local.z+1.25, -local.y))
    pigment_layer.data[vertex.index].color = (*pigment(point),1)
for layer in list(body.data.uv_layers):
    body.data.uv_layers.remove(layer)
uv_layer = body.data.uv_layers.new(name="SkinUV")
for face in body.data.polygons:
    face_uvs=[]
    for i in face.loop_indices:
        p=body.data.vertices[body.data.loops[i].vertex_index].co
        face_uvs.append(((math.atan2(-p.y+.17,p.x)%math.tau)/math.tau,(p.z+1.25-.61)/1.69))
    crosses_seam = max(p[0] for p in face_uvs)-min(p[0] for p in face_uvs)>.5
    for i,uv in zip(face.loop_indices,face_uvs):
        uv_layer.data[i].uv=(uv[0]+(1 if crosses_seam and uv[0]<.5 else 0),uv[1])


def export(destination):
    Path(destination).parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    # Merge skin meshes to one primitive while retaining independent eye pivots.
    parts = [obj for obj in scene.objects if obj.type == "MESH" and obj.parent == mantle]
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    if len(parts)>1:
        bpy.ops.object.join()
    bpy.context.object.name = "OctoSkin"
    bpy.ops.object.select_all(action="DESELECT")
    for obj in scene.objects:
        if obj.type in {"MESH", "EMPTY"}:
            obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(destination), export_format="GLB", use_selection=True,
                             use_active_scene=True, export_yup=True, export_apply=True,
                             export_animations=False, export_cameras=False, export_lights=False,
                             export_materials="EXPORT", export_normals=True, export_attributes=False)
    triangles = sum(len(face.vertices)-2 for obj in scene.objects if obj.type=="MESH" for face in obj.data.polygons)
    print({"stage":STAGE, "triangles":triangles, "bytes":Path(destination).stat().st_size,
           "animation_nodes":["OctoMantle","EyeLeft","EyeRight"]})


if "OCTO_OUTPUT" in globals():
    export(OCTO_OUTPUT)
elif os.environ.get("OCTO_OUTPUT"):
    export(os.environ["OCTO_OUTPUT"])
elif "__file__" in globals():
    export(Path(__file__).resolve().parent.parent / "src" / "assets" / "octo.glb")
