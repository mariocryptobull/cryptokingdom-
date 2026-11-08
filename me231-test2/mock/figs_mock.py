"""Sketches for the mock exam (PIL)."""
import os, math
from PIL import Image, ImageDraw, ImageFont
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'figs'); os.makedirs(OUT,exist_ok=True)
F=lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',s)
BLUE=(170,205,240); K=(0,0,0); GR=(90,90,90)
def arrow(d,p0,p1,w=4,hs=18):
    d.line([p0,p1],fill=K,width=w); a=math.atan2(p1[1]-p0[1],p1[0]-p0[0])
    d.polygon([p1,(p1[0]-hs*math.cos(a-0.4),p1[1]-hs*math.sin(a-0.4)),(p1[0]-hs*math.cos(a+0.4),p1[1]-hs*math.sin(a+0.4))],fill=K)
def dim(d,p0,p1,label,off,fs=30):
    m=((p0[0]+p1[0])/2,(p0[1]+p1[1])/2); arrow(d,m,p0,3,14); arrow(d,m,p1,3,14); d.text((m[0]+off[0],m[1]+off[1]),label,fill=K,font=F(fs))
# Q1
im=Image.new('RGB',(1400,500),'white'); d=ImageDraw.Draw(im)
d.rectangle([100,90,1300,120],fill=(120,120,120)); d.rectangle([100,390,1300,420],fill=(120,120,120)); d.rectangle([100,120,1300,390],fill=BLUE)
arrow(d,(900,60),(1150,60),5,20); d.text((1165,38),'U = 2 m/s',fill=K,font=F(30)); d.text((120,40),'moving plate',fill=K,font=F(28))
d.text((1080,430),'fixed plate',fill=K,font=F(28))
dim(d,(420,120),(420,390),'h = 5 mm',(15,-20))
arrow(d,(150,470),(300,470)); d.text((310,450),'x',fill=K,font=F(32)); arrow(d,(150,470),(150,300)); d.text((120,260),'y',fill=K,font=F(32))
d.text((720,200),'SAE oil:  μ = 0.40 kg/(m·s)',fill=K,font=F(26)); d.text((720,240),'ρ = 900 kg/m³,  dp/dx = constant',fill=K,font=F(26))
im.save(f'{OUT}/q1.png')
# Q2
im=Image.new('RGB',(1400,700),'white'); d=ImageDraw.Draw(im)
d.line([100,80,100,620,700,620,700,520],fill=K,width=6); d.line([700,440,700,80],fill=K,width=6)
d.rectangle([103,160,697,617],fill=BLUE); d.text((115,120),'▽  free surface (p_atm)',fill=K,font=F(28))
d.rectangle([697,443,703,517],fill=BLUE)
pts=[(700,445),(780,462),(900,470),(1100,478),(1300,486)]; pts2=[(700,515),(780,498),(900,492),(1100,490),(1300,494)]
d.polygon(pts+pts2[::-1],fill=BLUE); d.line(pts,fill=K,width=3); d.line(pts2,fill=K,width=3)
d.line([900,440,900,525],fill=GR,width=2); d.text((830,535),'vena contracta',fill=K,font=F(24)); d.text((830,568),'A_jet = C_c·πD²/4',fill=K,font=F(24))
dim(d,(740,445),(740,515),'D',(-8,-85),28)
d.line([700,160,1000,160],fill=GR,width=2); d.line([710,480,1000,480],fill=GR,width=1)
dim(d,(980,160),(980,480),'h',(15,-20))
d.text((200,380),'water, 20 °C',fill=K,font=F(28)); d.text((200,420),'large reservoir',fill=K,font=F(28))
im.save(f'{OUT}/q2.png')
# Q3
im=Image.new('RGB',(1400,620),'white'); d=ImageDraw.Draw(im)
d.line([80,60,80,540,420,540,420,480],fill=K,width=6); d.line([420,420,420,60],fill=K,width=6)
d.rectangle([83,120,417,537],fill=BLUE); d.text((95,80),'▽  (1)',fill=K,font=F(28))
d.rectangle([420,428,1240,472],fill=BLUE); d.line([420,425,1240,425],fill=K,width=4); d.line([420,475,1240,475],fill=K,width=4)
arrow(d,(1245,450),(1360,450),4,18); d.text((1250,390),'(2) free jet',fill=K,font=F(26))
d.ellipse([820,440,840,460],fill=K); d.text((800,485),'M (midpoint)',fill=K,font=F(24))
d.text((440,370),'sharp entrance',fill=K,font=F(24))
d.text((560,520),'L = 40 m,  D = 4 cm,  commercial steel (ε = 0.046 mm)',fill=K,font=F(24))
d.line([420,120,1330,120],fill=GR,width=2); d.line([1250,450,1330,450],fill=GR,width=2)
dim(d,(1300,120),(1300,450),'12 m',(-110,-20))
d.text((150,330),'water, 20 °C',fill=K,font=F(28))
im.save(f'{OUT}/q3.png')
