# Build timeline.json from voice/dur.json (re-run after regenerating the voice).
import json
d=json.load(open('voice/dur.json')); L=json.load(open('lines.json'))
gap={'v01':.5,'v02':.45,'v03':.4,'v04':.4,'v05':.4,'v06':.4,'v07':.6,'v08':.7,'v09':.6}
chunks={
'v01':["How does a jet engine push","an airliner through the sky?","Let's take one apart."],
'v02':["This is a turbofan,","the engine on almost every airliner.","Its job: grab a huge amount of air,","and throw it out the back, fast."],
'v03':["Up front, the giant fan.","Most of the air it pulls in","never enters the core.","It flows around it.","That's bypass air,","and it makes most of the thrust."],
'v04':["The rest enters the core.","Rows of compressor blades squeeze it,","stage after stage,","to over 30 times outside pressure."],
'v05':["In the combustor,","fuel sprays into that squeezed air","and burns nonstop,","like a blowtorch that never goes out."],
'v06':["The hot gas blasts through the turbine","and spins it.","Shafts carry that power forward","to drive the compressor and fan."],
'v07':["Then it rushes out the nozzle.","Air goes back,","so the engine goes forward.","Newton's third law."],
'v08':["Suck, squeeze, bang, blow.","All at once, all the time."],
'v09':["The Boeing 737's CFM56:","a five-foot fan,","about five times more air around the core","than through it,","and up to 27,000 pounds of thrust."],
'v10':["Congrats! You've discovered","the jet engine."],
}
t=.4; vo=[]
for l in L:
    i=l['id']; vo.append({'id':i,'t':round(t,2),'chunks':chunks[i]}); t+=d[i]+gap.get(i,0)
json.dump({'dur':round(t+2.6,1),'vo':vo},open('timeline.json','w'),indent=1)
print(round(t+2.6,1),[(v['id'],v['t']) for v in vo])
