# Build timeline.json from voice/dur.json (re-run after regenerating the voice).
import json
d=json.load(open('voice/dur.json')); L=json.load(open('lines.json'))
gap={'v01':.45,'v02':.3,'v03':.3,'v04':.3,'v05':.3,'v06':.55,'v07':.3,'v08':.3,'v09':.3,'v10':.3,'v11':.8,'v12':.6}
chunks={
'v01':["How does pressing a pedal","make a car move?","Follow the force,","from foot to road."],
'v02':["Gas pedal first.","No cable:","two sensors read how far you press","and tell the engine computer."],
'v03':["A small motor opens the throttle.","Air rushes in,","and fuel is added,","about 14.7 to 1 by weight."],
'v04':["Each spark","shoves a piston down.","The crankshaft turns","those pushes into spin."],
'v05':["The gearbox and differential","multiply that twist:","about 14 to 1","in first gear."],
'v06':["Driveshaft and axles carry it","to four hand-sized patches of rubber","that push the road back.","The car goes forward."],
'v07':["Now the brake.","The pedal is a 4-to-1 lever:","a 100 lb push","becomes 400."],
'v08':["A vacuum booster","uses engine suction","to roughly double it.","800 pounds."],
'v09':["That drives a one-inch","master cylinder piston","into the brake fluid.","About 1,000 psi."],
'v10':["Pascal's law:","that pressure acts everywhere.","On caliper pistons six times bigger,","it's 5,000 lb of clamp, roughly."],
'v11':["The pads squeeze the rotors,","and motion turns into heat."],
'v12':["What should we take apart next?"],
'v13':["Congrats! You've discovered","how a pedal moves a car."],
}
t=.4; vo=[]
for l in L:
    i=l['id']; vo.append({'id':i,'t':round(t,2),'chunks':chunks[i]}); t+=d[i]+gap.get(i,0)
json.dump({'dur':round(t+2.2,1),'vo':vo},open('timeline.json','w'),indent=1)
print(round(t+2.2,1),[(v['id'],v['t']) for v in vo])
