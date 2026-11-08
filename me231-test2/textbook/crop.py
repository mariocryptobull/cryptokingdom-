import subprocess,os
from PIL import Image
S=300/72
crops={ # label: [(page,(x0,y0,x1,y1)),...] in PDF points
 'P3.117':[(96,(26,96,284,302))],
 'P3.121':[(96,(284,214,545,268)),(96,(284,336,545,468))],
 'P3.126':[(97,(72,661,330,698)),(97,(330,95,590,217))],
 'P4.3':[(162,(26,370,284,461))],
 'P4.17':[(163,(330,259,590,520))],
 'P4.57':[(167,(330,208,590,309))],
 'P4.80':[(169,(330,398.5,590,698))],
 'P5.25':[(218,(26,546,284,593))],
 'P5.29':[(218,(284,286,545,357))],
 'P5.66':[(221,(330,626,590,706))],
 'P5.71':[(222,(284,166,545,262))],
 'P6.11':[(315,(72,123,330,216))],
 'P6.14':[(315,(72,392,330,531))],
 'P6.41':[(318,(284,533,545,592))],
 'P6.44':[(319,(72,293,330,329))],
 'P6.62':[(320,(284,478,545,698))],
}
os.makedirs('hi',exist_ok=True); os.makedirs('crops',exist_ok=True)
def pg(p):
    f=f'hi/p-{p:03d}.png'
    if not os.path.exists(f): subprocess.run(['pdftoppm','-r','300','-png','-f',str(p),'-l',str(p),'tb.pdf','hi/p'],check=True)
    return Image.open(f)
for lab,parts in crops.items():
    ims=[pg(p).crop(tuple(round(v*S) for v in box)) for p,box in parts]
    W=max(i.width for i in ims); H=sum(i.height for i in ims)+40*(len(ims)-1)
    c=Image.new('RGB',(W,H),'white'); y=0
    for i in ims: c.paste(i,(0,y)); y+=i.height+40
    c.save(f'crops/{lab}.png')
print('done')
