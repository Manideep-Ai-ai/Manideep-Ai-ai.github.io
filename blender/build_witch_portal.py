"""Build portal_witch.blend: the creator's pedestal and vortex (Witch.blend by @kanhaiya3d, used with the
site owner's go-ahead) plus a glowing figure rising out of the vortex, from Blender's CC0 Human Base Meshes.

Run:  Blender -b <Witch.blend> --python build_witch_portal.py -- <human_base_meshes_bundle.blend> <out.blend>
Witch.blend itself is never saved over.
"""
import math
import sys

import bpy
from mathutils import Vector

F0 = 160            # loop starts here: the creator's summoning (frames 1-139) is complete
INTRO = 40          # summoning intro rendered from here (the vortex starts to appear)
# The creator's rise keyframes (frames 49-139, Bezier ease ~ smoothstep); the figure follows the same curve.
RISE_T = "min(1, max(0, (frame-49)/90))"
RISE = f"({RISE_T}*{RISE_T}*(3-2*{RISE_T}))"
LOOP = 150          # final loop length; frames F0..F0+LOOP+24 are rendered, the tail crossfades into the head
T = f"((frame-{F0})/{LOOP})"
INK = (0.0070, 0.0056, 0.0048)   # #14110f in linear
BODY = "GEO-body_female_stylized"

sc = bpy.context.scene
args = sys.argv[sys.argv.index("--") + 1:]
bundle, out_path = args[0], args[1]


def drive(target, prop, expr, index=-1):
    fc = target.driver_add(prop, index) if index >= 0 else target.driver_add(prop)
    fc.driver.type = 'SCRIPTED'
    fc.driver.expression = expr
    return fc


def add(nt, kind, loc, **inputs):
    n = nt.nodes.new(kind)
    n.location = loc
    for k, v in inputs.items():
        n.inputs[k].default_value = v
    return n


def math_node(nt, op, loc, b=None, c=None):
    n = add(nt, "ShaderNodeMath", loc)
    n.operation = op
    if b is not None:
        n.inputs[1].default_value = b
    if c is not None:
        n.inputs[2].default_value = c
    return n


def scene_value(nt, name, loc):
    """Scene property as a shader uniform (driving node sockets makes EEVEE recompile every frame)."""
    a = add(nt, "ShaderNodeAttribute", loc)
    a.attribute_type, a.attribute_name = 'VIEW_LAYER', name
    return a.outputs["Fac"]


# ---------------------------------------------------------------- figure
def spirit_material():
    """Translucent ember spirit: fresnel-lit rim, flickering noise, legs dissolving into the vortex."""
    m = bpy.data.materials.new("Spirit")
    m.surface_render_method = 'BLENDED'
    m.use_backface_culling = True
    nt = m.node_tree
    nt.nodes.clear()
    L = nt.links
    out = add(nt, "ShaderNodeOutputMaterial", (1200, 0))
    tc = add(nt, "ShaderNodeTexCoord", (-1200, 0))
    sep = add(nt, "ShaderNodeSeparateXYZ", (-1000, -200))
    L.new(tc.outputs["Object"], sep.inputs[0])   # remesh drops Generated coords; range set in add_figure
    lw = add(nt, "ShaderNodeLayerWeight", (-1000, 200), Blend=0.55)
    rim = math_node(nt, 'POWER', (-800, 200), b=2.2)
    L.new(lw.outputs["Facing"], rim.inputs[0])
    # Looping 4D noise flicker: the offset travels a circle in (z, W), period LOOP frames.
    off = add(nt, "ShaderNodeCombineXYZ", (-1000, -450))
    L.new(scene_value(nt, "fig_cos", (-1200, -450)), off.inputs["Z"])
    vin = add(nt, "ShaderNodeVectorMath", (-800, -400))
    vin.operation = 'ADD'
    L.new(tc.outputs["Object"], vin.inputs[0])
    L.new(off.outputs[0], vin.inputs[1])
    nz = add(nt, "ShaderNodeTexNoise", (-600, -400), Scale=9.0, Detail=4.0, Roughness=0.55)
    nz.noise_dimensions = '4D'
    w = math_node(nt, 'ADD', (-800, -620), b=3.1)
    L.new(scene_value(nt, "fig_sin", (-1000, -620)), w.inputs[0])
    L.new(w.outputs[0], nz.inputs["W"])
    L.new(vin.outputs[0], nz.inputs["Vector"])
    flick = add(nt, "ShaderNodeMapRange", (-400, -400))
    flick.inputs["From Min"].default_value, flick.inputs["From Max"].default_value = 0.35, 0.7
    flick.inputs["To Min"].default_value, flick.inputs["To Max"].default_value = 0.35, 1.0
    L.new(nz.outputs["Fac"], flick.inputs["Value"])
    # Height fade: feet vanish inside the vortex, full body from the knees up.
    fade = add(nt, "ShaderNodeMapRange", (-800, -200))
    fade.interpolation_type = 'SMOOTHSTEP'
    fade.name = "HeightFade"
    fade.inputs["From Min"].default_value, fade.inputs["From Max"].default_value = 0.08, 0.62
    L.new(sep.outputs["Z"], fade.inputs["Value"])
    body = math_node(nt, 'MULTIPLY_ADD', (-600, 200), b=1.0, c=0.05)    # rim * 1.0 + 0.05: hollow, glowing edge
    L.new(rim.outputs[0], body.inputs[0])
    lit = math_node(nt, 'MULTIPLY', (-200, 0))
    L.new(body.outputs[0], lit.inputs[0])
    L.new(flick.outputs["Result"], lit.inputs[1])
    alpha = math_node(nt, 'MULTIPLY', (0, 0))
    L.new(lit.outputs[0], alpha.inputs[0])
    steep = math_node(nt, 'POWER', (-150, -150), b=2.2)        # dissolve reads clearly, not just dimmer
    L.new(fade.outputs["Result"], steep.inputs[0])
    front = math_node(nt, 'SUBTRACT', (-150, -300))     # Cycles ignores backface culling: mask back faces here
    front.inputs[0].default_value = 1.0
    L.new(add(nt, "ShaderNodeNewGeometry", (-350, -300)).outputs["Backfacing"], front.inputs[1])
    fade_front = math_node(nt, 'MULTIPLY', (-50, -200))
    L.new(steep.outputs[0], fade_front.inputs[0])
    L.new(front.outputs[0], fade_front.inputs[1])
    risen = math_node(nt, 'MULTIPLY', (50, -300))       # summoning: invisible until it rises out of the flames
    L.new(fade_front.outputs[0], risen.inputs[0])
    L.new(scene_value(nt, "rise", (-150, -450)), risen.inputs[1])
    L.new(risen.outputs[0], alpha.inputs[1])
    ramp = add(nt, "ShaderNodeValToRGB", (200, 200))
    els = ramp.color_ramp.elements
    els[0].position, els[0].color = 0.1, (0.55, 0.06, 0.02, 1)
    els[1].position, els[1].color = 0.95, (1.0, 0.78, 0.5, 1)
    mid = els.new(0.5)
    mid.color = (1.0, 0.3, 0.07, 1)
    L.new(lit.outputs[0], ramp.inputs["Fac"])
    strength = math_node(nt, 'MULTIPLY', (200, -150), b=4.0)   # below clipping, so the fade shows
    L.new(alpha.outputs[0], strength.inputs[0])
    em = add(nt, "ShaderNodeEmission", (450, 100))
    L.new(ramp.outputs["Color"], em.inputs["Color"])
    L.new(strength.outputs[0], em.inputs["Strength"])
    tr = add(nt, "ShaderNodeBsdfTransparent", (450, -100))
    mix = add(nt, "ShaderNodeMixShader", (700, 0))
    L.new(alpha.outputs[0], mix.inputs["Fac"])
    L.new(tr.outputs[0], mix.inputs[1])
    L.new(em.outputs[0], mix.inputs[2])
    add_sh = add(nt, "ShaderNodeAddShader", (950, 0))           # extra additive glow keeps it luminous
    L.new(mix.outputs[0], add_sh.inputs[0])
    glow = add(nt, "ShaderNodeEmission", (700, -200), Color=(1.0, 0.35, 0.1, 1))
    gs = math_node(nt, 'MULTIPLY', (450, -300), b=0.9)
    L.new(alpha.outputs[0], gs.inputs[0])
    L.new(gs.outputs[0], glow.inputs["Strength"])
    L.new(glow.outputs[0], add_sh.inputs[1])
    L.new(add_sh.outputs[0], out.inputs["Surface"])
    return m


def add_figure():
    with bpy.data.libraries.load(bundle, link=False) as (src, dst):
        dst.objects = [n for n in src.objects if n == BODY]
    body = dst.objects[0]
    body.parent = None
    for c in list(body.children):
        c.parent = None
    coll = bpy.data.collections.new("Figure")
    sc.collection.children.link(coll)
    coll.objects.link(body)
    body.name = "Spirit"
    body.data.materials.clear()
    body.data.materials.append(spirit_material())
    # The base mesh has eye sockets and a mouth cavity that show through a translucent spirit.
    # Smooth the head away (weighted group, soft falloff at the neck), then voxel-remesh to close it.
    zs = [v.co.z for v in body.data.vertices]
    top, height = max(zs), max(zs) - min(zs)
    head = body.vertex_groups.new(name="head")
    for v in body.data.vertices:
        w = min(1.0, max(0.0, (v.co.z - (top - 0.17 * height)) / (0.04 * height)))
        if w > 0:
            head.add([v.index], w, 'REPLACE')
    fade = body.data.materials[0].node_tree.nodes["HeightFade"]
    low = min(zs)
    fade.inputs["From Min"].default_value = low + 0.45 * height    # legs and hips are flame
    fade.inputs["From Max"].default_value = low + 0.86 * height    # glowing from the shoulders up
    face = body.modifiers.new("SoftenFace", 'SMOOTH')
    face.factor, face.iterations, face.vertex_group = 1.0, 40, "head"
    rem = body.modifiers.new("Close", 'REMESH')
    rem.mode, rem.voxel_size, rem.use_smooth_shade = 'VOXEL', 0.006, True
    soft = body.modifiers.new("Soften", 'SMOOTH')
    soft.factor, soft.iterations = 0.6, 4
    # Normalise: 0.62 m tall, feet just inside the top of the vortex, under the creator's Girl_Base marker.
    body.location = (0, 0, 0)
    bpy.context.view_layer.update()
    lo = min((body.matrix_world @ Vector(c)).z for c in body.bound_box)
    hi = max((body.matrix_world @ Vector(c)).z for c in body.bound_box)
    s = 0.62 / (hi - lo)
    body.scale = (s, s, s)
    bpy.context.view_layer.update()
    cx = sum((body.matrix_world @ Vector(c)).x for c in body.bound_box) / 8
    lo = min((body.matrix_world @ Vector(c)).z for c in body.bound_box)
    base = sc.objects["Girl_Base"].matrix_world.translation
    body.location = (-cx, base.y, 0.06 - lo)     # legs sink into the creator's flames
    z0 = body.location.z
    drive(body, "location", f"{z0:.4f} + 0.025*sin(2*pi*{T}) - 0.6*(1-{RISE})", 2)   # rises, then hovers
    drive(body, "rotation_euler", f"pi + 0.32 + 0.05*sin(2*pi*{T} + 1.2)", 2)  # turned away, three-quarter back: rising into the vortex
    drive(body, "rotation_euler", f"-0.06 + 0.015*sin(2*pi*{T})", 0)        # head tipped back a touch
    return body


# ---------------------------------------------------------------- stage
def scene_drivers():
    for key, expr in (("fig_cos", f"0.8*cos(2*pi*{T})"), ("fig_sin", f"0.8*sin(2*pi*{T})"), ("rise", RISE)):
        sc[key] = 0.0
        drive(sc, f'["{key}"]', expr)


def world_for_footer():
    """Keep the creator's world for lighting, but camera rays see the footer's ink."""
    nt = sc.world.node_tree
    out = next(n for n in nt.nodes if n.bl_idname == 'ShaderNodeOutputWorld')
    original = out.inputs["Surface"].links[0].from_socket
    lp = add(nt, "ShaderNodeLightPath", (-300, 300))
    ink = add(nt, "ShaderNodeBackground", (-300, -200), Color=(*INK, 1), Strength=1.0)
    mix = add(nt, "ShaderNodeMixShader", (100, 100))
    nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs["Fac"])
    nt.links.new(original, mix.inputs[1])
    nt.links.new(ink.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])


def stage_light():
    for name, kind, loc, energy, color, size in (
            ("PortalGlow", 'POINT', (0, 0, 0.42), 2.2, (1.0, 0.3, 0.08), 0.15),
            ("RimLight", 'AREA', (0.0, 1.6, 1.1), 14.0, (1.0, 0.55, 0.35), 1.2),
            ("FillLight", 'AREA', (1.4, -1.6, 1.2), 2.5, (0.8, 0.82, 1.0), 1.5)):
        ld = bpy.data.lights.new(name, kind)
        ld.energy, ld.color = energy, color
        if kind == 'AREA':
            ld.size = size
        else:
            ld.shadow_soft_size = size
        ob = bpy.data.objects.new(name, ld)
        sc.collection.objects.link(ob)
        ob.location = loc
        if kind == 'AREA':
            ob.rotation_euler = (Vector((0, 0, 0.4)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        if name == "PortalGlow":
            drive(ld, "energy", f"2.2 + 0.5*sin(2*pi*{T}*3)")


def camera():
    cd = bpy.data.cameras.new("FooterCam")
    cd.lens = 40
    cam = bpy.data.objects.new("FooterCam", cd)
    sc.collection.objects.link(cam)
    cam.location = (0, -2.05, 0.62)
    aim = Vector((0, 0, 0.42)) - cam.location
    cam.rotation_euler = aim.to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam


def compositor():
    ng = bpy.data.node_groups.new("Footer Comp", "CompositorNodeTree")
    sc.compositing_node_group = ng
    rl = ng.nodes.new("CompositorNodeRLayers")
    glare = ng.nodes.new("CompositorNodeGlare")
    glare.inputs["Type"].default_value = 'Bloom'
    glare.inputs["Threshold"].default_value = 0.85
    glare.inputs["Strength"].default_value = 0.6
    glare.inputs["Size"].default_value = 0.65
    ng.interface.new_socket("Image", in_out='OUTPUT', socket_type='NodeSocketColor')
    out = ng.nodes.new("NodeGroupOutput")
    ng.links.new(rl.outputs["Image"], glare.inputs["Image"])
    ng.links.new(glare.outputs[0], out.inputs[0])


def render_settings():
    # The creator's vortex uses true displacement, which only Cycles renders. Lowered from the file's
    # 250 samples / 1080x1920 so the footer loop renders in reasonable time.
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'GPU'
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    sc.cycles.samples = 32
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 4
    sc.cycles.transparent_max_bounces = 8
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1280, 720, 100
    sc.frame_start, sc.frame_end = F0, F0 + LOOP + 24
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.render.image_settings.file_format = 'PNG'


scene_drivers()
add_figure()
world_for_footer()
stage_light()
camera()
compositor()
render_settings()
bpy.ops.wm.save_as_mainfile(filepath=out_path, copy=False)
print("SAVED", out_path)
