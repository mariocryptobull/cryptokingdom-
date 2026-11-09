# Build timeline.json from voice/dur.json (re-run after regenerating the voice).
import json
d=json.load(open('voice/dur.json')); L=json.load(open('lines.json'))
gap={'v01':.45,'v02':.45,'v03':.4,'v04':.4,'v05':.45,'v06':.35,'v07':.7,'v08':.45,'v09':.5,'v10':.6,'v11':.8}
chunks={
'v01':["What's inside an AirPod?","We scaled one up a hundred times,","and took it apart."],
'v02':["Crack the glued shell,","and every part comes out."],
'v03':["First, the battery:","a tiny lithium-ion button cell.","In AirPods Pro 2,","about 50 milliamp-hours."],
'v04':["The main chip runs Bluetooth","and processes the sound.","A thin antenna catches","the signal from your phone."],
'v05':["Now the speaker.","A copper voice coil sits around a magnet.","Pulse current through it,","and the coil pushes the diaphragm","back and forth,","thousands of times a second."],
'v06':["Beamforming mics","aim at your voice,","and a tiny vent equalizes pressure,","so your ear doesn't feel plugged."],
'v07':["A force sensor in the stem","feels your squeeze,","and a skin sensor knows","when it's in your ear."],
'v08':["Now, noise cancellation.","The outer mic hears the noise.","The chip flips that wave upside down,","and the driver plays it.","Peak meets trough,","and they cancel out."],
'v09':["Apple says it re-tunes that","200 times a second."],
'v10':["The catch?","It's all glued shut.","iFixit gave them 0 out of 10","for repairability."],
'v11':["What should we take apart next?"],
'v12':["Congrats! You've discovered","what's inside your earbuds."],
}
t=.4; vo=[]
for l in L:
    i=l['id']; vo.append({'id':i,'t':round(t,2),'chunks':chunks[i]}); t+=d[i]+gap.get(i,0)
json.dump({'dur':round(t+2.6,1),'vo':vo},open('timeline.json','w'),indent=1)
print(round(t+2.6,1),[(v['id'],v['t']) for v in vo])
