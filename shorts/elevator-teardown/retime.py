# Build timeline.json from voice/dur.json (re-run after regenerating the voice).
import json
d=json.load(open('voice/dur.json')); L=json.load(open('lines.json'))
gap={'v01':.6,'v02':.5,'v03':.45,'v04':.4,'v05':.5,'v06':.45,'v07':.5,'v08':.35,'v09':.7,'v10':.8}
chunks={
'v01':["How does a steel box","carry you up a hundred floors?","Let's take","an elevator apart."],
'v02':["This is a traction elevator.","The car rides up and down the shaft,","hung from steel hoist ropes."],
'v03':["Up top, the ropes wrap","over a grooved wheel called the sheave.","An electric motor turns it,","and friction in the grooves does the lifting."],
'v04':["On the other end of the ropes","hangs the counterweight.","It weighs about as much as the car,","plus 40% of a full load."],
'v05':["So the motor never","lifts the whole car.","It only moves the difference."],
'v06':["Guide rails run","the full height of the shaft,","keeping the car and counterweight","on track."],
'v07':["Codes require","at least three hoist ropes,","each built with","a huge safety margin."],
'v08':["But what if","the car starts falling?","Up top, a governor watches the speed.","Too fast, and it trips."],
'v09':["It grabs its own rope,","which yanks the safety brakes.","Steel wedges bite the guide rails","and stop the car."],
'v10':["In 1854, in New York,","Elisha Otis stood on a raised platform","and had its rope cut.","It dropped a few inches, then held."],
'v11':["Congrats! You've discovered","the elevator."],
}
for l in L: assert l['id'] in chunks
t=.4; vo=[]
for l in L:
    i=l['id']; vo.append({'id':i,'t':round(t,2),'chunks':chunks[i]}); t+=d[i]+gap.get(i,0)
json.dump({'dur':round(t+2.6,1),'vo':vo},open('timeline.json','w'),indent=1)
print(round(t+2.6,1),[(v['id'],v['t']) for v in vo])
