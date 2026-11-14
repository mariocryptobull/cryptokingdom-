# Build timeline.json from voice/dur.json (re-run after regenerating the voice).
import json
d=json.load(open('voice/dur.json')); L=json.load(open('lines.json'))
gap={'v01':.4,'v17':.28,'v18':.22}
G=.13
chunks={
'v01':["What if one machine","controlled the future of AI?"],
'v02':["This is an","EUV lithography machine.","And you see, only one company","on Earth can build it."],
'v03':["It starts with molten tin,","dripping through a vacuum."],
'v04':["A CO₂ laser hits them.","50,000 times a second."],
'v05':["Each bursts into plasma,","40× hotter than","the Sun's surface."],
'v06':["It glows at","13.5 nanometres.","Extreme ultraviolet."],
'v07':["Why the vacuum?","Air swallows this light.","So does glass."],
'v08':["So no lenses.","Only mirrors."],
'v09':["Each one stacks dozens of","molybdenum and silicon layers."],
'v10':["How smooth?","Scaled to Germany,","the tallest bump is 1 mm."],
'v11':["The light hits a patterned mask,","then shrinks onto a wafer."],
'v12':["Both stages sprint,","yet align within nanometres."],
'v13':["Transistor gates?","Around 20 nanometres.","A hair? 80,000."],
'v14':["Each costs around","$150 million.","The newest, nearly 400."],
'v15':["Shipping one takes","40 containers","and 3 cargo planes."],
'v16':["And China?","ASML has never shipped it one.","Dutch rules block it."],
'v17':["Since 2022, US rules","also curb its top AI chips."],
'v18':["Of course, it's just a machine.","But whoever controls it","controls the AI race."],
'v19':["What should we","take apart next?"],
}
t=.3; vo=[]
for l in L:
    i=l['id']; vo.append({'id':i,'t':round(t,2),'chunks':chunks[i]}); t+=d[i]+gap.get(i,G)
json.dump({'dur':round(t-G+1.8,1),'vo':vo},open('timeline.json','w'),indent=1)
print(round(t-G+1.8,1),[(v['id'],v['t']) for v in vo])
