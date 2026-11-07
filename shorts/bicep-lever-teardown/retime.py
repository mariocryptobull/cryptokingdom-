# Build timeline.json from voice/dur.json (re-run after regenerating the voice).
import json
d=json.load(open('voice/dur.json')); L=json.load(open('lines.json'))
gap={'v01':.4,'v02':.35,'v03':.3,'v04':.35,'v05':.3,'v06':.35,'v07':.35,'v08':.4,'v09':.3,'v10':.3,'v11':1.3,'v12':.6,'v13':.5}
chunks={
'v01':["Your bicep is a lever.","And mechanically,","it's losing."],
'v02':["Take the arm apart","like a machine.","Upper arm: the frame.","Forearm: a beam.","Elbow: the pivot."],
'v03':["The biceps is the actuator.","Its tendon anchors","just 4 cm from the elbow."],
'v04':["The dumbbell sits","35 cm out.","Pivot, effort, load:","a third-class lever."],
'v05':["Balance the torques.","10 kg is 98 newtons.","At 35 cm:","34 newton-meters."],
'v06':["With only 4 cm of leverage,","the biceps must pull","about 860 newtons.","Nearly 9× the weight."],
'v07':["Real arms run","7 to 10 times.","So why build it this badly?"],
'v08':["Speed.","Shorten the muscle 1 cm,","and the hand swings almost 9.","Small actuator,","huge range of motion."],
'v09':["And the load changes","through the curl.","Arm straight down,","almost no torque."],
'v10':["At 90 degrees,","the forearm is level.","The lever arm is longest.","That's the sticking point."],
'v11':["Curl past it,","and the torque drops again."],
'v12':["So every rep, your biceps pulls","about 9× what you're holding."],
'v13':["What should we take apart next?"],
'v14':["Congrats! You've discovered","the lever in your arm."],
}
t=.4; vo=[]
for l in L:
    i=l['id']; vo.append({'id':i,'t':round(t,2),'chunks':chunks[i]}); t+=d[i]+gap.get(i,0)
json.dump({'dur':round(t+2.3,1),'vo':vo},open('timeline.json','w'),indent=1)
print(round(t+2.3,1),[(v['id'],v['t']) for v in vo])
