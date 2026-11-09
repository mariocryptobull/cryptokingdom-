# Build timeline.json from voice/dur.json (re-run after regenerating the voice).
import json
d=json.load(open('voice/dur.json')); L=json.load(open('lines.json'))
gap={'v09':.8,'v10':.6}
chunks={
'v01':["This is Starship,","the biggest rocket ever flown,","about four hundred feet tall.","Let's take it apart."],
'v02':["The bottom stage is Super Heavy:","thirty-three Raptor engines,","over eighteen million pounds of thrust","at liftoff."],
'v03':["Inside, stainless-steel tanks","hold super-cold liquid oxygen","and liquid methane."],
'v04':["Each Raptor runs","full-flow staged combustion:","two preburners","spin two turbopumps,","then everything burns in the chamber","and roars out the nozzle."],
'v05':["Why methane?","It burns cleaner than kerosene,","so engines can be reused.","And SpaceX plans to make it on Mars."],
'v06':["At staging, the ship ignites","through a vented ring.","The booster flies home on grid fins,","and the tower's arms catch it."],
'v07':["The ship has six Raptors:","three sea-level, three vacuum.","Hex tiles shield it,","and four flaps steer the fall."],
'v08':["In September, Flight 14","reached orbit and released","26 Starlink satellites","from its payload bay."],
'v09':["Next, SpaceX says:","refueling in orbit,","a Moon lander for NASA,","and then Mars.","Cargo first, then crews,","then a city."],
'v10':["What should we take apart next?"],
'v11':["Congrats! You've discovered","the rocket built for Mars."],
}
t=.4; vo=[]
for l in L:
    i=l['id']; vo.append({'id':i,'t':round(t,2),'chunks':chunks[i]}); t+=d[i]+gap.get(i,.35)
json.dump({'dur':round(t+2.1,1),'vo':vo},open('timeline.json','w'),indent=1)
print(round(t+2.1,1),[(v['id'],v['t']) for v in vo])
