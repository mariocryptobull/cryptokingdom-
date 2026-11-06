# Build timeline.json from voice/dur.json (re-run after regenerating the voice).
import json
d=json.load(open('voice/dur.json')); L=json.load(open('lines.json'))
gap={'v01':.5,'v02':.35,'v03':.35,'v04':.35,'v05':.35,'v06':.35,'v07':1.4,'v08':.4,'v09':.9,'v10':.6}
chunks={
'v01':["What's actually inside","a military recon drone?","Let's take one apart."],
'v02':["Small recon drones are often","hand-launched planes:","under two kilos,","with a wingspan around 1.5 meters."],
'v03':["An electric motor","spins the propeller.","A rechargeable battery fills the fuselage,","good for an hour or more aloft."],
'v04':["The brain is","the flight controller.","Gyros and accelerometers feel every tilt,","and GPS tells it where it is."],
'v05':["Autopilot software flies","a preplanned route of waypoints","on its own,","or a pilot takes over by hand."],
'v06':["A radio datalink","streams live video to a ground station,","out to around ten kilometers."],
'v07':["And under the nose, the whole point:","a stabilized camera turret,","with a daylight and a thermal camera."],
'v08':["So where does Palantir fit in?","It doesn't build the drone.","It builds the software."],
'v09':["The Pentagon's Maven system,","largely built on Palantir software,","fuses drone video with other feeds,","flags objects with computer vision,","and maps them for human analysts."],
'v10':["What should we take apart next?"],
'v11':["Congrats! You've discovered","the recon drone."],
}
t=.4; vo=[]
for l in L:
    i=l['id']; vo.append({'id':i,'t':round(t,2),'chunks':chunks[i]}); t+=d[i]+gap.get(i,0)
json.dump({'dur':round(t+2.4,1),'vo':vo},open('timeline.json','w'),indent=1)
print(round(t+2.4,1),[(v['id'],v['t']) for v in vo])
