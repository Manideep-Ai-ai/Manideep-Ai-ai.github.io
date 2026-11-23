"""Build portal.blend: an original summoning portal (stepped pedestal, igniting runes, rising vortex).

Run:  Blender -b -y --factory-startup --python build_portal.py -- <out.blend>
Everything animated is driven by `frame`, so frames 1..LOOP form a seamless loop (frame LOOP+1 == frame 1).
Witch.blend (by @kanhaiya3d) was used only as a visual reference; nothing is copied from it.
"""
import math
import random
import sys

import bmesh
import bpy

LOOP = 150                       # 5 s at 30 fps
T = f"((frame-1)/{LOOP})"        # 0..1 over the loop
INK = (0.0070, 0.0056, 0.0048)   # #14110f in linear
FIRE = (1.0, 0.16, 0.035)        # red-orange energy
TOP_Z = 0.48                     # top face of the pedestal

random.seed(25)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene


def drive(target, prop, expr, index=-1):
    fc = target.driver_add(prop, index) if index >= 0 else target.driver_add(prop)
    fc.driver.type = 'SCRIPTED'
    fc.driver.expression = expr
    return fc


# Animated values live on the scene and reach shaders through Attribute nodes, which EEVEE treats as
# uniforms. Driving node sockets directly made EEVEE recompile every material on every frame (~18 s/frame).
ANIM = {
    "ignite": f"0.98*((2*{T}) - floor(2*{T})) - 0.05",   # rune ring threshold, two sweeps per loop
    "breath": f"2.2 + 0.8*sin(2*pi*{T})",                 # rune base glow
    "phase": f"2*pi*3*{T}",                               # vortex strands rise three cycles per loop
    "loop_cos": f"0.7*cos(2*pi*{T})",                     # 4D noise travels a circle in (z, W)
    "loop_sin": f"0.7*sin(2*pi*{T})",
}


def drive_scene():
    for key, expr in ANIM.items():
        sc[key] = 0.0
        drive(sc, f'["{key}"]', expr)


def anim(nt, name, loc):
    a = nt.nodes.new("ShaderNodeAttribute")
    a.attribute_type, a.attribute_name, a.location, a.label = 'VIEW_LAYER', name, loc, name
    return a.outputs["Fac"]


def node(nt, kind, loc, **inputs):
    n = nt.nodes.new(kind)
    n.location = loc
    for k, v in inputs.items():
        n.inputs[k].default_value = v
    return n


def math_node(nt, op, loc, a=None, b=None):
    n = nt.nodes.new("ShaderNodeMath")
    n.operation = op
    n.location = loc
    if a is not None:
        n.inputs[0].default_value = a
    if b is not None:
        n.inputs[1].default_value = b
    return n


def new_mat(name):
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (900, 0)
    return m, nt, out


def link_obj(name, mesh, coll):
    ob = bpy.data.objects.new(name, mesh)
    coll.objects.link(ob)
    return ob


def collection(name):
    c = bpy.data.collections.new(name)
    sc.collection.children.link(c)
    return c


# ---------------------------------------------------------------- pedestal
def stone_material():
    m, nt, out = new_mat("Stone")
    L = nt.links
    tc = node(nt, "ShaderNodeTexCoord", (-900, 0))
    nz = node(nt, "ShaderNodeTexNoise", (-650, 120), Scale=7.0, Detail=10.0, Roughness=0.62)
    vo = node(nt, "ShaderNodeTexVoronoi", (-650, -160), Scale=11.0)
    vo.feature = 'DISTANCE_TO_EDGE'
    L.new(tc.outputs["Object"], nz.inputs["Vector"])
    L.new(tc.outputs["Object"], vo.inputs["Vector"])
    mix = math_node(nt, 'MULTIPLY', (-420, 0))
    L.new(nz.outputs["Fac"], mix.inputs[0])
    cracks = node(nt, "ShaderNodeMapRange", (-420, -200))
    cracks.inputs["From Max"].default_value = 0.06
    L.new(vo.outputs["Distance"], cracks.inputs["Value"])
    L.new(cracks.outputs["Result"], mix.inputs[1])
    ramp = node(nt, "ShaderNodeValToRGB", (-200, 100))
    ramp.color_ramp.elements[0].position, ramp.color_ramp.elements[0].color = 0.08, (0.010, 0.009, 0.009, 1)
    ramp.color_ramp.elements[1].position, ramp.color_ramp.elements[1].color = 0.62, (0.085, 0.074, 0.068, 1)
    L.new(mix.outputs[0], ramp.inputs["Fac"])
    bump = node(nt, "ShaderNodeBump", (-200, -200), Strength=0.35, Distance=0.02)
    L.new(mix.outputs[0], bump.inputs["Height"])
    bsdf = node(nt, "ShaderNodeBsdfPrincipled", (300, 0), Roughness=0.82)
    L.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    L.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    L.new(bsdf.outputs[0], out.inputs["Surface"])
    return m


def build_pedestal(coll):
    bm = bmesh.new()
    z = 0.0
    for radius, depth in ((1.75, 0.12), (1.42, 0.12), (1.1, 0.12), (0.78, 0.12)):
        geom = bmesh.ops.create_cone(bm, cap_ends=True, segments=160, radius1=radius, radius2=radius, depth=depth)
        bmesh.ops.translate(bm, vec=(0, 0, z + depth / 2), verts=geom["verts"])
        z += depth
    me = bpy.data.meshes.new("Pedestal")
    bm.to_mesh(me)
    bm.free()
    ob = link_obj("Pedestal", me, coll)
    bev = ob.modifiers.new("Bevel", 'BEVEL')
    bev.width, bev.segments, bev.limit_method = 0.012, 3, 'ANGLE'
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(stone_material())
    return ob


# ---------------------------------------------------------------- runes
def quad_strip(bm, p0, p1, width, z=TOP_Z + 0.002):
    """Thin flat quad from p0 to p1 (2D points) lying on the top face."""
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    ln = math.hypot(dx, dy) or 1.0
    nx, ny = -dy / ln * width / 2, dx / ln * width / 2
    vs = [bm.verts.new((x, y, z)) for x, y in (
        (p0[0] + nx, p0[1] + ny), (p1[0] + nx, p1[1] + ny), (p1[0] - nx, p1[1] - ny), (p0[0] - nx, p0[1] - ny))]
    bm.faces.new(vs)


def ring(bm, r, width, seg=180, **kw):
    for i in range(seg):
        a0, a1 = 2 * math.pi * i / seg, 2 * math.pi * (i + 1) / seg
        quad_strip(bm, (r * math.cos(a0), r * math.sin(a0)), (r * math.cos(a1), r * math.sin(a1)), width, **kw)


def glyph(bm, angle, r_in, r_out, width, **kw):
    """A small invented rune: 2-4 strokes on a 3x3 lattice, oriented radially."""
    grid = [(u, v) for u in (-1, 0, 1) for v in (0, 1, 2)]
    t = (-math.sin(angle), math.cos(angle))
    rad = (math.cos(angle), math.sin(angle))
    half_w = (r_out - r_in) * 0.32
    for _ in range(random.randint(2, 4)):
        a, b = random.sample(grid, 2)
        pts = []
        for u, v in (a, b):
            rr = r_in + (r_out - r_in) * (v / 2)
            pts.append((rad[0] * rr + t[0] * u * half_w, rad[1] * rr + t[1] * u * half_w))
        quad_strip(bm, pts[0], pts[1], width, **kw)


def rune_material():
    m, nt, out = new_mat("Runes")
    L = nt.links
    tc = node(nt, "ShaderNodeTexCoord", (-1100, 0))
    sep = node(nt, "ShaderNodeSeparateXYZ", (-900, 0))
    L.new(tc.outputs["Object"], sep.inputs[0])
    comb = node(nt, "ShaderNodeCombineXYZ", (-720, 0))
    L.new(sep.outputs["X"], comb.inputs["X"])
    L.new(sep.outputs["Y"], comb.inputs["Y"])
    dist = node(nt, "ShaderNodeVectorMath", (-540, 0))
    dist.operation = 'LENGTH'
    L.new(comb.outputs[0], dist.inputs[0])
    # Ignition ring: lit where dist < threshold and not dist < threshold - band. Two waves per loop.
    thr = anim(nt, "ignite", (-540, -220))
    front = math_node(nt, 'LESS_THAN', (-320, 60))
    L.new(dist.outputs["Value"], front.inputs[0])
    L.new(thr, front.inputs[1])
    tail_thr = math_node(nt, 'SUBTRACT', (-320, -200), b=0.16)
    L.new(thr, tail_thr.inputs[0])
    tail = math_node(nt, 'LESS_THAN', (-120, -200))
    L.new(dist.outputs["Value"], tail.inputs[0])
    L.new(tail_thr.outputs[0], tail.inputs[1])
    band = math_node(nt, 'SUBTRACT', (-120, 60))
    L.new(front.outputs[0], band.inputs[0])
    L.new(tail.outputs[0], band.inputs[1])
    # Steady ember glow that breathes once per loop, plus the bright ring.
    breath = anim(nt, "breath", (-120, -380))
    boost = math_node(nt, 'MULTIPLY_ADD', (100, 0), b=26.0)
    L.new(band.outputs[0], boost.inputs[0])
    L.new(breath, boost.inputs[2])
    em = node(nt, "ShaderNodeEmission", (320, 0), Color=(*FIRE, 1))
    L.new(boost.outputs[0], em.inputs["Strength"])
    L.new(em.outputs[0], out.inputs["Surface"])
    return m


def build_runes(coll):
    bm = bmesh.new()
    ring(bm, 0.70, 0.010)
    ring(bm, 0.585, 0.007)
    ring(bm, 0.20, 0.008, 96)
    for i in range(22):
        glyph(bm, 2 * math.pi * (i + 0.5) / 22, 0.60, 0.685, 0.0065)
    # Seven-point star {7/3}: one point per portfolio.
    star = [(0.52 * math.cos(math.pi / 2 + 2 * math.pi * k / 7), 0.52 * math.sin(math.pi / 2 + 2 * math.pi * k / 7)) for k in range(7)]
    for k in range(7):
        quad_strip(bm, star[k], star[(k + 3) % 7], 0.006)
    for k in range(7):
        a = math.pi / 2 + 2 * math.pi * k / 7
        quad_strip(bm, (0.2 * math.cos(a), 0.2 * math.sin(a)), (0.52 * math.cos(a), 0.52 * math.sin(a)), 0.004)
    me = bpy.data.meshes.new("Runes")
    bm.to_mesh(me)
    bm.free()
    ob = link_obj("Runes", me, coll)
    me.materials.append(rune_material())
    return ob


def build_halo(coll):
    """A ring of glyphs floating inside the vortex, turning once per loop."""
    bm = bmesh.new()
    ring(bm, 0.80, 0.008, z=0.0)
    ring(bm, 0.66, 0.006, z=0.0)
    for i in range(30):
        glyph(bm, 2 * math.pi * (i + 0.5) / 30, 0.675, 0.785, 0.007, z=0.0)
    me = bpy.data.meshes.new("Halo")
    bm.to_mesh(me)
    bm.free()
    ob = link_obj("Halo", me, coll)
    ob.location = (0, 0, TOP_Z + 0.95)
    ob.rotation_mode = 'ZXY'           # spin about its own axis, then tilt toward the camera
    ob.rotation_euler = (math.radians(-16), 0, 0)
    drive(ob, "rotation_euler", f"-2*pi*{T}", 2)
    m, nt, out = new_mat("Halo")
    m.surface_render_method = 'BLENDED'
    m.use_backface_culling = False
    em = node(nt, "ShaderNodeEmission", (300, 0), Color=(1.0, 0.36, 0.1, 1))
    strength = math_node(nt, 'MULTIPLY_ADD', (100, 0), b=2.5)
    strength.inputs[2].default_value = 2.0
    nt.links.new(anim(nt, "breath", (-100, 0)), strength.inputs[0])
    nt.links.new(strength.outputs[0], em.inputs["Strength"])
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    me.materials.append(m)
    return ob


# ---------------------------------------------------------------- vortex
def vortex_material(name, arms, rise, seed, strength):
    """Spiral strands rising seamlessly: sin(arms*angle + rise*2pi*z - phase), broken up by looping 4D noise."""
    m, nt, out = new_mat(name)
    m.surface_render_method = 'BLENDED'
    m.use_backface_culling = False
    L = nt.links
    tc = node(nt, "ShaderNodeTexCoord", (-1500, 0))
    centered = node(nt, "ShaderNodeVectorMath", (-1300, 0))
    centered.operation = 'SUBTRACT'
    centered.inputs[1].default_value = (0.5, 0.5, 0.0)
    L.new(tc.outputs["Generated"], centered.inputs[0])
    sep = node(nt, "ShaderNodeSeparateXYZ", (-1100, 0))
    L.new(centered.outputs[0], sep.inputs[0])
    ang = math_node(nt, 'ARCTAN2', (-900, 120))
    L.new(sep.outputs["Y"], ang.inputs[0])
    L.new(sep.outputs["X"], ang.inputs[1])
    a_term = math_node(nt, 'MULTIPLY', (-700, 120), b=float(arms))
    L.new(ang.outputs[0], a_term.inputs[0])
    z_term = math_node(nt, 'MULTIPLY', (-700, -40), b=2 * math.pi * rise)
    L.new(sep.outputs["Z"], z_term.inputs[0])
    spiral = math_node(nt, 'ADD', (-520, 60))
    L.new(a_term.outputs[0], spiral.inputs[0])
    L.new(z_term.outputs[0], spiral.inputs[1])
    phase = anim(nt, "phase", (-700, -200))
    moving = math_node(nt, 'SUBTRACT', (-340, 60))
    L.new(spiral.outputs[0], moving.inputs[0])
    L.new(phase, moving.inputs[1])
    wave = math_node(nt, 'SINE', (-160, 60))
    L.new(moving.outputs[0], wave.inputs[0])
    wave01 = math_node(nt, 'MULTIPLY_ADD', (20, 60), a=None, b=0.5)
    wave01.inputs[2].default_value = 0.5
    L.new(wave.outputs[0], wave01.inputs[0])
    # Looping 4D noise: offset travels a circle in (z, W), so frame LOOP+1 matches frame 1.
    off = node(nt, "ShaderNodeCombineXYZ", (-1100, -300))
    L.new(anim(nt, "loop_cos", (-1300, -300)), off.inputs["Z"])
    noisy_in = node(nt, "ShaderNodeVectorMath", (-900, -300))
    noisy_in.operation = 'ADD'
    L.new(centered.outputs[0], noisy_in.inputs[0])
    L.new(off.outputs[0], noisy_in.inputs[1])
    nz = node(nt, "ShaderNodeTexNoise", (-700, -380), Scale=3.2, Detail=6.0, Roughness=0.6, Distortion=0.6)
    nz.noise_dimensions = '4D'
    w = math_node(nt, 'ADD', (-900, -480), b=seed)
    L.new(anim(nt, "loop_sin", (-1100, -480)), w.inputs[0])
    L.new(w.outputs[0], nz.inputs["W"])
    L.new(noisy_in.outputs[0], nz.inputs["Vector"])
    thin = math_node(nt, 'POWER', (110, 60), b=7.0)   # narrow the bands into strands
    L.new(wave01.outputs[0], thin.inputs[0])
    strands = math_node(nt, 'MULTIPLY', (200, 0))
    L.new(thin.outputs[0], strands.inputs[0])
    L.new(nz.outputs["Fac"], strands.inputs[1])
    # Fade in above the pedestal and out at the top.
    fade_in = node(nt, "ShaderNodeMapRange", (-160, -300))
    fade_in.interpolation_type = 'SMOOTHSTEP'
    fade_in.inputs["From Max"].default_value = 0.12
    L.new(sep.outputs["Z"], fade_in.inputs["Value"])
    fade_out = node(nt, "ShaderNodeMapRange", (-160, -500))
    fade_out.interpolation_type = 'SMOOTHSTEP'
    fade_out.inputs["From Min"].default_value = 1.0
    fade_out.inputs["From Max"].default_value = 0.35
    L.new(sep.outputs["Z"], fade_out.inputs["Value"])
    fade = math_node(nt, 'MULTIPLY', (40, -400))
    L.new(fade_in.outputs["Result"], fade.inputs[0])
    L.new(fade_out.outputs["Result"], fade.inputs[1])
    masked = math_node(nt, 'MULTIPLY', (380, -100))
    L.new(strands.outputs[0], masked.inputs[0])
    L.new(fade.outputs[0], masked.inputs[1])
    ramp = node(nt, "ShaderNodeValToRGB", (540, -100))
    els = ramp.color_ramp.elements
    els[0].position, els[0].color = 0.04, (0, 0, 0, 1)
    els[1].position, els[1].color = 0.9, (1.0, 0.8, 0.55, 1)
    mid = els.new(0.16)
    mid.color = (*FIRE, 1)
    hot = els.new(0.5)
    hot.color = (1.0, 0.42, 0.08, 1)
    L.new(masked.outputs[0], ramp.inputs["Fac"])
    em = node(nt, "ShaderNodeEmission", (760, -100))
    L.new(ramp.outputs["Color"], em.inputs["Color"])
    # The far wall shows through and its strands slant the other way; dim it so one swirl reads.
    geo = node(nt, "ShaderNodeNewGeometry", (380, -320))
    side = math_node(nt, 'MULTIPLY_ADD', (560, -320), b=-0.72 * strength)
    side.inputs[2].default_value = strength
    L.new(geo.outputs["Backfacing"], side.inputs[0])
    L.new(side.outputs[0], em.inputs["Strength"])
    tr = node(nt, "ShaderNodeBsdfTransparent", (760, 100))
    add = nt.nodes.new("ShaderNodeAddShader")
    add.location = (900, 0)
    out.location = (1080, 0)
    L.new(tr.outputs[0], add.inputs[0])
    L.new(em.outputs[0], add.inputs[1])
    L.new(add.outputs[0], out.inputs["Surface"])
    return m


def build_funnel(name, coll, r0, r1, height, twist_deg, mat):
    bm = bmesh.new()
    rings, seg = 64, 160
    grid = []
    for j in range(rings + 1):
        h = j / rings
        r = r0 + (r1 - r0) * h ** 1.6
        grid.append([bm.verts.new((r * math.cos(2 * math.pi * i / seg), r * math.sin(2 * math.pi * i / seg), h * height))
                     for i in range(seg)])
    for j in range(rings):
        for i in range(seg):
            bm.faces.new((grid[j][i], grid[j][(i + 1) % seg], grid[j + 1][(i + 1) % seg], grid[j + 1][i]))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = link_obj(name, me, coll)
    ob.location = (0, 0, TOP_Z + 0.004)
    tw = ob.modifiers.new("Twist", 'SIMPLE_DEFORM')
    tw.deform_method, tw.deform_axis, tw.angle = 'TWIST', 'Z', math.radians(twist_deg)
    me.materials.append(mat)
    return ob


# ---------------------------------------------------------------- sparks
def build_sparks(coll, count=42):
    me = bpy.data.meshes.new("Spark")
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.011)
    bm.to_mesh(me)
    bm.free()
    m, nt, out = new_mat("Spark")
    em = node(nt, "ShaderNodeEmission", (600, 0), Color=(1.0, 0.55, 0.2, 1), Strength=30.0)
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    me.materials.append(m)
    for k in range(count):
        ob = link_obj(f"Spark.{k:02d}", me, coll)
        rises = random.choice((1, 2, 2, 3))            # whole number of climbs per loop
        off = random.random()
        a0 = random.uniform(0, 2 * math.pi)
        r0 = random.uniform(0.3, 0.65)
        h = f"({rises}*{T}+{off:.3f} - floor({rises}*{T}+{off:.3f}))"
        ang = f"({a0:.3f} + 2*pi*{T} + 4.0*{h})"
        rad = f"({r0:.3f} + 0.55*{h}*{h})"
        drive(ob, "location", f"{rad}*cos({ang})", 0)
        drive(ob, "location", f"{rad}*sin({ang})", 1)
        drive(ob, "location", f"{TOP_Z} + 1.9*{h}", 2)
        for ax in range(3):
            drive(ob, "scale", f"sin(pi*{h})*1.2", ax)


# ---------------------------------------------------------------- scene
def build_world_and_lights(coll):
    world = bpy.data.worlds.new("Ink")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (*INK, 1)
    bg.inputs["Strength"].default_value = 1.0
    sc.world = world

    def light(name, kind, loc, energy, color, size=1.0):
        ld = bpy.data.lights.new(name, kind)
        ld.energy, ld.color = energy, color
        if kind == 'AREA':
            ld.size = size
        if kind == 'POINT':
            ld.shadow_soft_size = size
        ob = link_obj(name, ld, coll)
        ob.location = loc
        return ob, ld

    _, core = light("PortalGlow", 'POINT', (0, 0, TOP_Z + 0.25), 140.0, (1.0, 0.32, 0.1), 0.4)
    drive(core, "energy", f"140 + 30*sin(2*pi*{T})")
    key, _ = light("Key", 'AREA', (2.2, -2.6, 3.2), 60.0, (1.0, 0.86, 0.75), 2.5)
    key.rotation_euler = (math.radians(50), 0, math.radians(40))
    rim, _ = light("Rim", 'AREA', (-1.5, 2.8, 2.0), 40.0, (0.75, 0.8, 1.0), 2.0)
    rim.rotation_euler = (math.radians(-60), 0, math.radians(200))


def build_camera(coll):
    cd = bpy.data.cameras.new("PortalCam")
    cd.lens = 38
    cam = link_obj("PortalCam", cd, coll)
    cam.location = (0, -5.6, 1.75)
    target = bpy.data.objects.new("CamTarget", None)
    coll.objects.link(target)
    target.location = (0, 0, 1.08)
    tr = cam.constraints.new('TRACK_TO')
    tr.target, tr.track_axis, tr.up_axis = target, 'TRACK_NEGATIVE_Z', 'UP_Y'
    sc.camera = cam


def build_compositor():
    ng = bpy.data.node_groups.new("Portal Comp", "CompositorNodeTree")
    sc.compositing_node_group = ng
    rl = ng.nodes.new("CompositorNodeRLayers")
    glare = ng.nodes.new("CompositorNodeGlare")
    glare.inputs["Type"].default_value = 'Bloom'
    glare.inputs["Threshold"].default_value = 0.9
    glare.inputs["Strength"].default_value = 0.55
    glare.inputs["Size"].default_value = 0.6
    ng.interface.new_socket("Image", in_out='OUTPUT', socket_type='NodeSocketColor')
    out = ng.nodes.new("NodeGroupOutput")
    ng.links.new(rl.outputs["Image"], glare.inputs["Image"])
    ng.links.new(glare.outputs[0], out.inputs[0])


def configure_render():
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.fps = 30
    sc.frame_start, sc.frame_end = 1, LOOP
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1280, 720, 100
    sc.eevee.taa_render_samples = 12
    sc.view_settings.view_transform = 'Standard'   # keeps the ink background exact (#14110f)
    sc.view_settings.look = 'None'
    sc.render.image_settings.file_format = 'PNG'


def main():
    out_path = sys.argv[sys.argv.index("--") + 1]
    stage = collection("Pedestal")
    energy = collection("Energy")
    rig = collection("Camera and lights")
    drive_scene()
    build_pedestal(stage)
    build_runes(stage)
    build_funnel("VortexOuter", energy, 0.42, 1.0, 1.75, 210, vortex_material("VortexOuter", 7, 1.1, 1.7, 2.2))
    build_funnel("VortexInner", energy, 0.28, 0.6, 1.5, 300, vortex_material("VortexInner", 4, 0.9, 8.3, 1.9))
    build_halo(energy)
    build_sparks(energy)
    build_world_and_lights(rig)
    build_camera(rig)
    build_compositor()
    configure_render()
    bpy.ops.wm.save_as_mainfile(filepath=out_path)
    print("SAVED", out_path)


main()
