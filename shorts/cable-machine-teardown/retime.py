# Build timeline.json from voice/dur.json (re-run after regenerating the voice).
import json
d=json.load(open('voice/dur.json')); L=json.load(open('lines.json'))
gap={'v01':.5,'v02':.4,'v03':.4,'v04':.4,'v05':.4,'v06':.45,'v07':.5,'v08':.45,'v09':1.4,'v10':.8,'v11':.45}
chunks={
'v01':["Why does fifty pounds","on the cable machine","feel so much lighter?","Let's take one apart."],
'v02':["Steel plates ride up and down","two guide rods.","The selector pin decides","how many plates you lift."],
'v03':["A steel cable runs from the stack,","over a chain of pulleys,","out to your handle."],
'v04':["Tie the cable straight to the stack,","and it's one to one.","Fifty on the pin,","fifty in your hand."],
'v05':["But many machines hang the stack","from a movable pulley.","Now two strands of cable","share the weight."],
'v06':["Each strand carries half,","so your hand feels about 25 pounds.","The price? Pull the handle two feet,","and the stack rises one."],
'v07':["Force × distance stays the same.","Some machines go four to one:","a quarter of the force,","four times the travel."],
'v08':["Then, reality.","Each pulley loses a few percent to friction.","Lifting, it adds to the load.","Lowering, it helps you."],
'v09':["The steel cable barely stretches,","about a millimeter here,","so the load hits instantly,","not springy."],
'v10':["So the label says fifty.","Your hands feel about 25:","closer to 30 pulling,","20 letting go."],
'v11':["What should we take apart next?"],
'v12':["Congrats! You've discovered","the cable machine."],
}
t=.4; vo=[]
for l in L:
    i=l['id']; vo.append({'id':i,'t':round(t,2),'chunks':chunks[i]}); t+=d[i]+gap.get(i,0)
json.dump({'dur':round(t+2.2,1),'vo':vo},open('timeline.json','w'),indent=1)
print(round(t+2.2,1),[(v['id'],v['t']) for v in vo])
