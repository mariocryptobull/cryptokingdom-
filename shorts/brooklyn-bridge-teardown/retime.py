# Build timeline.json from voice/dur.json (re-run after regenerating the voice).
import json
d=json.load(open('voice/dur.json')); L=json.load(open('lines.json'))
gap={'v01':.5,'v02':.4,'v03':.4,'v04':.45,'v05':.4,'v06':.4,'v07':.4,'v08':.5,'v09':.6,'v10':.6}
chunks={
'v01':["How was the","Brooklyn Bridge built?","When it opened, it was the longest","suspension bridge on Earth."],
'v02':["Work began in 1870.","Its designer, John Roebling,","had died,","so his son Washington took over."],
'v03':["First, caissons:","giant upside-down wooden boxes,","sunk into the riverbed,","where men dug","in compressed air."],
'v04':["Brooklyn's sank 44 feet,","Manhattan's 78.","Workers got the bends,","and Washington was left bedridden."],
'v05':["His wife Emily","carried his orders.","On the caissons, granite towers","rose 276 feet."],
'v06':["On shore,","anchorages:","60,000 tons of stone,","holding chains for the cables."],
'v07':["From 1877,","wheels spun steel wire","across the river.","Four cables,","19 strands each."],
'v08':["Then suspenders","and diagonal stays","hung the deck","from the cables and towers."],
'v09':["On May 24, 1883,","it opened.","Emily crossed first.","About 150,000 people","followed."],
'v10':["Trains crossed","until 1944.","Since 2021,","it even has","a protected bike lane."],
'v11':["Congrats! You've discovered","how the Brooklyn Bridge","was built."],
}
t=.4; vo=[]
for l in L:
    i=l['id']; vo.append({'id':i,'t':round(t,2),'chunks':chunks[i]}); t+=d[i]+gap.get(i,0)
json.dump({'dur':round(t+2.4,1),'vo':vo},open('timeline.json','w'),indent=1)
print(round(t+2.4,1),[(v['id'],v['t']) for v in vo])
