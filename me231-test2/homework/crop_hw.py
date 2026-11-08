import subprocess,os
from PIL import Image
S=300/72
crops={
 'P3.114':[(95,(72,627,330,708)),(95,(330,95,590,245))],
 'P3.124':[(97,(72,274,330,516))],
 'P3.127':[(97,(333,232,590,438))],
 'P4.1':[(161,(330,612,592,700))],
 'P4.4':[(162,(26,460,284,591))],
 'P4.9':[(162,(284,653,545,708)),(163,(72,97,330,123))],
 'P4.27':[(164,(284,507,545,593))],
 'P4.34':[(165,(330,99,590,189))],
 'P4.47':[(166,(284,524,545,571))],
 'P4.51':[(167,(72,219,330,278))],
 'P4.59':[(167,(330,409,590,469))],
 'P5.24':[(218,(26,474,284,546))],
 'P5.31':[(218,(284,427,545,475))],
 'P5.37':[(219,(72,544,330,603))],
 'P5.72':[(222,(284,260,545,380))],
 'P5.73':[(222,(284,379,545,497))],
 'P5.74':[(222,(284,496,545,575))],
 'P6.4':[(314,(26,673,284,708)),(314,(284,116,545,145))],
 'P6.8':[(314,(284,484,545,531))],
 'P6.18':[(315,(330,504,590,697))],
 'P6.19':[(316,(26,99,284,282))],
 'P6.43':[(318,(284,672,545,708)),(319,(72,97,330,293))],
 'P6.52':[(319,(330,523,590,698))],
 'P6.55':[(320,(26,336,284,496))],
}
os.makedirs('hi',exist_ok=True); os.makedirs('hwcrops',exist_ok=True)
def pg(p):
    f=f'hi/p-{p:03d}.png'
    if not os.path.exists(f): subprocess.run(['pdftoppm','-r','300','-png','-f',str(p),'-l',str(p),'tb.pdf','hi/p'],check=True)
    return Image.open(f)
for lab,parts in crops.items():
    ims=[pg(p).crop(tuple(round(v*S) for v in box)) for p,box in parts]
    W=max(i.width for i in ims); H=sum(i.height for i in ims)+30*(len(ims)-1)
    c=Image.new('RGB',(W,H),'white'); y=0
    for i in ims: c.paste(i,(0,y)); y+=i.height+30
    c.save(f'hwcrops/{lab}.png')
ims=[(l,Image.open(f'hwcrops/{l}.png')) for l in crops]
for k in range(0,len(ims),12):
    grp=ims[k:k+12]; cols=4; W=560
    th=[i.copy() for _,i in grp]
    for t in th: t.thumbnail((W-10,800))
    rows=(len(th)+cols-1)//cols; H=max(t.height for t in th)+10
    c=Image.new('RGB',(W*cols,H*rows),'gray')
    for j,t in enumerate(th): c.paste(t,((j%cols)*W,(j//cols)*H))
    c.save(f'hwsheet{k//12}.png')
print('ok')
