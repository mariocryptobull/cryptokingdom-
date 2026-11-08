"""Simple schematic sketches for the practice problems (PIL)."""
from PIL import Image, ImageDraw, ImageFont
import os
OUT=os.path.join(os.path.dirname(__file__),'figs')
F=lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',s)
FI=lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf',s) if os.path.exists('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf') else F(s)
BLUE=(170,205,240); K=(0,0,0)
def arrow(d,p0,p1,w=4,hs=18):
    import math
    d.line([p0,p1],fill=K,width=w)
    a=math.atan2(p1[1]-p0[1],p1[0]-p0[0])
    pts=[p1,(p1[0]-hs*math.cos(a-0.4),p1[1]-hs*math.sin(a-0.4)),(p1[0]-hs*math.cos(a+0.4),p1[1]-hs*math.sin(a+0.4))]
    d.polygon(pts,fill=K)
def dim(d,p0,p1,label,off=(10,-20),f=None):
    arrow(d,((p0[0]+p1[0])/2,(p0[1]+p1[1])/2),p0,3,14); arrow(d,((p0[0]+p1[0])/2,(p0[1]+p1[1])/2),p1,3,14)
    d.text(((p0[0]+p1[0])/2+off[0],(p0[1]+p1[1])/2+off[1]),label,fill=K,font=f or F(30))

# P2: parallel plates
im=Image.new('RGB',(1400,520),'white');d=ImageDraw.Draw(im)
d.rectangle([100,80,1300,110],fill=(120,120,120)); d.rectangle([100,410,1300,440],fill=(120,120,120))
d.rectangle([100,110,1300,410],fill=BLUE)
d.line([700,110,700,410],fill=K,width=3)
import math
pts=[]
for i in range(0,301,5):
    y=i-150; u=(1-(y/150)**2)*380; pts.append((700+u,110+i))
d.line(pts,fill=K,width=4)
for i in range(30,300,45):
    y=i-150; u=(1-(y/150)**2)*380
    if u>30: arrow(d,(700,110+i),(700+u,110+i),3,14)
arrow(d,(150,470),(300,470)); d.text((310,450),'x',fill=K,font=FI(34))
arrow(d,(150,470),(150,330)); d.text((120,290),'y',fill=K,font=FI(34))
d.line([130,260,1300,260],fill=(90,90,90),width=2)
d.text((1140,215),'y = 0',fill=K,font=F(28))
dim(d,(560,110),(560,410),'2h = 4 mm',(-260,-20))
d.text((160,20),'fixed plate',fill=K,font=F(30)); d.text((1050,450),'fixed plate',fill=K,font=F(30))
d.text((1000,140),'u(y)',fill=K,font=FI(34))
im.save(f'{OUT}/p2.png')

# P3: siphon
im=Image.new('RGB',(1300,900),'white');d=ImageDraw.Draw(im)
d.line([80,220,80,700,560,700,560,220],fill=K,width=6)
d.rectangle([83,330,557,697],fill=BLUE)
d.text((95,290),'▽',fill=K,font=F(30)); d.text((130,290),'1  (free surface)',fill=K,font=F(28))
# tube
tube=[(400,640),(400,150),(900,150),(900,780)]
d.line(tube,fill=K,width=26,joint='curve'); d.line(tube,fill=BLUE,width=16,joint='curve')
d.text((915,790),'2  (exit, free jet)',fill=K,font=F(28))
d.ellipse([890,140,910,160],fill=K); d.text((870,90),'A (top)',fill=K,font=F(28))
d.line([570,330,1150,330],fill=(90,90,90),width=2)
d.line([920,150,1150,150],fill=(90,90,90),width=2); d.line([920,790,1150,790],fill=(90,90,90),width=2)
dim(d,(1100,150),(1100,330),'1.5 m',(15,-20)); dim(d,(1100,330),(1100,790),'3.0 m',(15,-20))
d.text((420,560),'D = 4 cm',fill=K,font=F(26))
d.text((150,520),'water, 20 °C',fill=K,font=F(28))
im.save(f'{OUT}/p3.png')

# P4: venturi
im=Image.new('RGB',(1400,700),'white');d=ImageDraw.Draw(im)
top=[(80,120),(380,120),(620,195),(780,195),(1100,120),(1320,120)]
bot=[(x,400-(y-120)) for x,y in top]
d.polygon(top+bot[::-1],fill=BLUE); d.line(top,fill=K,width=5); d.line(bot,fill=K,width=5)
arrow(d,(100,350),(250,350)); d.text((100,300),'Q',fill=K,font=FI(34))
d.text((120,170),'1',fill=K,font=F(34)); d.text((640,240),'2',fill=K,font=F(34))
dim(d,(330,120),(330,400),'D₁ = 10 cm',(15,-110)); dim(d,(740,195),(740,325),'D₂ = 5 cm',(15,-20))
# manometer U-tube
for x in (230,700):
    yb=400 if x==230 else 325
    d.line([x-10,yb,x-10,640],fill=K,width=3); d.line([x+10,yb,x+10,640],fill=K,width=3)
d.line([220,640,710,640],fill=K,width=3); d.line([240,620,690,620],fill=K,width=3)
d.rectangle([221,560,239,639],fill=(110,110,110)); d.rectangle([240,621,690,639],fill=(110,110,110)); d.rectangle([691,500,709,639],fill=(110,110,110))
d.rectangle([221,401,239,559],fill=BLUE); d.rectangle([691,326,709,499],fill=BLUE)
d.line([250,560,900,560],fill=(90,90,90),width=2); d.line([720,500,900,500],fill=(90,90,90),width=2)
dim(d,(880,500),(880,560),'h = 20 cm',(15,-20),F(28))
d.text((760,600),'mercury (13 550 kg/m³)',fill=K,font=F(26))
im.save(f'{OUT}/p4.png')

# P10: reservoir system
im=Image.new('RGB',(1400,760),'white');d=ImageDraw.Draw(im)
d.line([60,80,60,330,360,330,360,80],fill=K,width=6); d.rectangle([63,130,357,327],fill=BLUE)
d.line([1000,400,1000,700,1340,700,1340,400],fill=K,width=6); d.rectangle([1003,520,1337,697],fill=BLUE)
d.text((75,95),'▽',fill=K,font=F(28)); d.text((1015,485),'▽',fill=K,font=F(28))
pipe=[(360,300),(560,300),(560,640),(1000,640)]
d.line(pipe,fill=K,width=24); d.line(pipe,fill=BLUE,width=14)
d.rectangle([760,622,800,658],outline=K,width=4,fill='white'); d.text((730,670),'gate valve',fill=K,font=F(24))
d.text((575,270),'elbow',fill=K,font=F(24)); d.text((575,600),'elbow',fill=K,font=F(24))
d.text((365,250),'sharp entrance',fill=K,font=F(24)); d.text((880,595),'exit',fill=K,font=F(24))
d.line([360,130,1380,130],fill=(90,90,90),width=2); d.line([1340,520,1380,520],fill=(90,90,90),width=2)
dim(d,(1370,130),(1370,520),'Δz = 20 m',(-190,-20))
d.text((600,420),'L = 100 m total, D = 8 cm',fill=K,font=F(26)); d.text((600,455),'commercial steel',fill=K,font=F(26))
d.text((120,190),'A',fill=K,font=F(32)); d.text((1150,560),'B',fill=K,font=F(32))
im.save(f'{OUT}/p10.png')
print('ok')
