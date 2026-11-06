# Build timeline.json from voice/dur.json (re-run after regenerating the voice).
import json
d=json.load(open('voice/dur.json')); L=json.load(open('lines.json'))
gap={'v01':.6,'v02':.6,'v03':.45,'v04':.45,'v05':.45,'v06':.6,'v07':.5,'v08':.6,'v09':2.2,'v10':.7}
chunks={
'v01':["How do you dig a subway tunnel","without tearing up the city?","You send in a","tunnel boring machine."],
'v02':["Think of it as","a factory on rails:","a giant drill up front,","and a moving construction site behind it."],
'v03':["The cutterhead spins","a few times a minute.","Steel disc cutters press into the rock","until it cracks and chips away."],
'v04':["In soft ground,","pressurized soil or slurry","holds up the face,","so the earth doesn't collapse."],
'v05':["Behind the cutterhead,","a steel shield","keeps the tunnel open","while the crew works inside."],
'v06':["The broken rock, called muck,","is scooped up,","carried back by a screw conveyor,","then belted out of the tunnel."],
'v07':["Now the clever part.","A robotic arm sets","curved concrete segments into a ring,","building the tunnel lining as it goes."],
'v08':["Hydraulic rams push off","that fresh ring","to shove the whole machine forward.","Adjust the rams, and it steers."],
'v09':["Cut, muck, ring, push.","Repeat, around the clock."],
'v10':["New York's Second Avenue Subway machine","was 450 feet long,","and averaged about 60 feet a day","under Manhattan."],
'v11':["Congrats! You've discovered","the tunnel boring machine."],
}
t=.4; vo=[]
for l in L:
    i=l['id']; vo.append({'id':i,'t':round(t,2),'chunks':chunks[i]}); t+=d[i]+gap.get(i,0)
json.dump({'dur':round(t+2.6,1),'vo':vo},open('timeline.json','w'),indent=1)
print(round(t+2.6,1),[(v['id'],v['t']) for v in vo])
