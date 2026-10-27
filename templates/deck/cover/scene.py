import bpy, sys, math, mathutils
argv=sys.argv[sys.argv.index('--')+1:]; V=argv[0]; OUT=argv[1]; SAMPLES=int(argv[2]); RES=int(argv[3])
import os; D=os.path.dirname(os.path.abspath(__file__))+'/'
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene; sc.render.engine='CYCLES'; sc.cycles.device='CPU'; sc.cycles.samples=SAMPLES; sc.cycles.use_denoising=True
sc.render.resolution_x=1920; sc.render.resolution_y=1080; sc.render.resolution_percentage=RES; sc.view_settings.view_transform='AgX'
sc.cycles.max_bounces=24; sc.cycles.transmission_bounces=24
w=bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True; w.node_tree.nodes['Background'].inputs[1].default_value=0
img=bpy.data.images.load(D+'seal_h.png'); img.colorspace_settings.name='Non-Color'
cam=bpy.data.objects.new('cam',bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera=cam; cam.data.lens=50
def look(o,t): o.rotation_euler=(mathutils.Vector(t)-o.location).to_track_quat('-Z','Y').to_euler()
def area(n,loc,t,size,sy,col,en):
    d=bpy.data.lights.new(n,'AREA'); d.shape='RECTANGLE'; d.size=size; d.size_y=sy; d.color=col; d.energy=en; o=bpy.data.objects.new(n,d); sc.collection.objects.link(o); o.location=loc; look(o,t); return o
def strip(n,loc,t,sx,sy,col,stg):
    bpy.ops.mesh.primitive_plane_add(size=1,location=loc); o=bpy.context.active_object; o.scale=(sx,sy,1); look(o,t); o.rotation_euler.rotate_axis('X',math.pi)
    m=bpy.data.materials.new(n); m.use_nodes=True; nt=m.node_tree; nt.nodes.clear(); e=nt.nodes.new('ShaderNodeEmission'); e.inputs[0].default_value=(*col,1); e.inputs[1].default_value=stg
    out=nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0],out.inputs[0]); o.data.materials.append(m); o.visible_camera=False; return o
def bumpmat(name,glass,col,rough,strength,metal=0):
    m=bpy.data.materials.new(name); m.use_nodes=True; nt=m.node_tree; b=nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value=(*col,1); b.inputs['Roughness'].default_value=rough; b.inputs['Metallic'].default_value=metal
    if glass: b.inputs['Transmission Weight'].default_value=1; b.inputs['IOR'].default_value=1.5; (b.inputs['Dispersion'].__setattr__('default_value',0.5) if 'Dispersion' in b.inputs else None)
    tc=nt.nodes.new('ShaderNodeTexCoord'); mp=nt.nodes.new('ShaderNodeMapping'); tx=nt.nodes.new('ShaderNodeTexImage'); tx.image=img; tx.extension='CLIP'
    bu=nt.nodes.new('ShaderNodeBump'); bu.inputs['Strength'].default_value=strength; bu.inputs['Distance'].default_value=0.02
    nt.links.new(tc.outputs['Generated'],mp.inputs[0]); nt.links.new(mp.outputs[0],tx.inputs[0]); nt.links.new(tx.outputs['Color'],bu.inputs['Height']); nt.links.new(bu.outputs['Normal'],b.inputs['Normal'])
    if not glass:  # 로고 선은 더 매끈하고 밝은 금속으로
        mix=nt.nodes.new('ShaderNodeMix'); mix.data_type='FLOAT'; mix.inputs[2].default_value=rough; mix.inputs[3].default_value=0.08
        nt.links.new(tx.outputs['Color'],mix.inputs[0]); nt.links.new(mix.outputs[0],b.inputs['Roughness'])
        cm=nt.nodes.new('ShaderNodeMix'); cm.data_type='RGBA'; cm.inputs[6].default_value=(*col,1); cm.inputs[7].default_value=(0.55,0.65,0.85,1)
        nt.links.new(tx.outputs['Color'],cm.inputs[0]); nt.links.new(cm.outputs[2],b.inputs['Base Color'])
    return m
def floor(rough=0.15):
    bpy.ops.mesh.primitive_plane_add(size=60); f=bpy.context.active_object
    m=bpy.data.materials.new('f'); m.use_nodes=True; b=m.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value=(0.004,0.005,0.008,1); b.inputs['Roughness'].default_value=rough; f.data.materials.append(m); return f
def coin(r=1.0,depth=0.22,mat=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=256,radius=r,depth=depth); c=bpy.context.active_object
    bv=c.modifiers.new('b','BEVEL'); bv.width=0.035; bv.segments=8; bv.limit_method='ANGLE'
    bpy.ops.object.shade_auto_smooth() if hasattr(bpy.ops.object,'shade_auto_smooth') else bpy.ops.object.shade_smooth()
    c.data.materials.append(mat); return c
if V=='crystal':
    floor(0.08)
    c=coin(1.0,0.26,bumpmat('g',True,(0.55,0.72,1.0),0.0,0.6)); c.rotation_euler=(math.radians(90),0,math.radians(-24)); c.location=(0,0,1.02)
    cam.location=(1.3,-5.4,1.25); look(cam,(0.1,0,0.95))
    strip('s1',(-2.6,2.5,1.4),(0,0,1),5,0.35,(0.15,0.4,1.0),8); strip('s2',(2.4,3.0,2.4),(0,0,1),5,0.18,(0.8,0.9,1.0),6); strip('s3',(0.5,-3,3.2),(0,0,1),3,0.25,(1,1,1),4)
    area('k',(-3,-2.5,3),(0,0,1),2,0.4,(0.4,0.6,1.0),300); area('rim',(2.5,2,1.2),(0,0,1),3,0.2,(0.2,0.45,1.0),600)
elif V=='slab':
    floor(0.3).data.materials[0]=bumpmat('m',False,(0.016,0.038,0.11),0.32,0.5,metal=1)
    f=sc.objects[-1] if False else None
    CAMS={'s1':((1.6,-3.0,1.9),(0.85,0.35,0)),'s2':((0.9,-3.6,0.75),(0.6,0.6,0)),'s3':((0.6,-1.6,3.3),(0.75,0.15,0)),'s4':((-0.2,-3.3,1.3),(-0.1,0.45,0))}
    cl,ct=CAMS[argv[4] if len(argv)>4 else 's1']; cam.location=cl; look(cam,ct)
    # 바닥 판의 로고 위치·크기: Generated 좌표가 판 전체라 Mapping으로 가운데 2x2만 쓰게
    m=bpy.data.materials['m']; mp=[n for n in m.node_tree.nodes if n.type=='MAPPING'][0]; mp.inputs['Location'].default_value=(-14.5,-14.5,0); mp.inputs['Scale'].default_value=(30,30,1)
    area('rim',(-4,3.5,0.5),(0,0,0),7,0.15,(0.27,0.40,0.72),1700); area('rim2',(3.5,4,0.4),(0,0,0),5,0.1,(0.56,0.67,0.86),320); area('fill',(0,-3,4),(0,0,0),3,3,(0.13,0.22,0.39),45)
elif V=='float':
    # 검은 유리 동전이 비스듬히 떠 있고 아래 바닥에 비침
    floor(0.05)
    c=coin(1.0,0.16,bumpmat('k',False,(0.01,0.014,0.03),0.12,0.55,metal=1)); c.rotation_euler=(math.radians(62),0,math.radians(-20)); c.location=(-0.2,0,1.1)
    cam.location=(1.2,-5.2,1.4); look(cam,(0.0,0,1.0))
    area('rim',(-3.5,2.5,1.5),(0,0,1),5,0.15,(0.2,0.45,1.0),1500); area('rim2',(3,2.5,2.5),(0,0,1),4,0.12,(0.7,0.85,1.0),600); area('top',(0,-2,4),(0,0,1),2.5,0.5,(0.6,0.7,1.0),180)
sc.render.filepath=OUT; sc.render.image_settings.file_format='PNG'; bpy.ops.render.render(write_still=True)
