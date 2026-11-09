# Build timeline.json from voice/dur.json (re-run after regenerating the voice).
import json
d=json.load(open('voice/dur.json')); L=json.load(open('lines.json'))
gap={'v01':.5,'v02':.4,'v03':.5,'v04':.4,'v05':.5,'v06':.5,'v07':.6,'v08':.6,'v09':.8}
chunks={
'v01':["How does a treadmill know","how fast you're running?","It counts.","Let's take one apart."],
'v02':["Up front,","a motor and its controller.","A short drive belt and a heavy flywheel","turn the front roller."],
'v03':["The running belt","loops around two rollers","and slides over a lubricated deck,","sitting on rubber cushions","that soften every landing."],
'v04':["Now the clever part.","A small magnet on the roller","sweeps past a sensor once per turn.","Each pulse means","one roller's circumference of belt."],
'v05':["So, speed equals","roller RPM times circumference.","A 2.5-inch roller at 700 RPM:","about five miles an hour."],
'v06':["Each foot strike brakes the belt.","The controller sees the pulses slow down","and pushes more current","until the speed recovers.","Belts still dip four to nine percent."],
'v07':["An incline motor turns a lead screw","to tilt the deck.","Pull the safety key,","and the motor stops."],
'v08':["Why does it feel easier?","There's no air to push through,","and the belt pulls your feet back for you.","A 1996 study found","a one percent incline","matches running outside."],
'v09':["What should we take apart next?"],
'v10':["Congrats! You've discovered","the treadmill."],
}
t=.4; vo=[]
for l in L:
    i=l['id']; vo.append({'id':i,'t':round(t,2),'chunks':chunks[i]}); t+=d[i]+gap.get(i,0)
json.dump({'dur':round(t+2.6,1),'vo':vo},open('timeline.json','w'),indent=1)
print(round(t+2.6,1),[(v['id'],v['t']) for v in vo])
