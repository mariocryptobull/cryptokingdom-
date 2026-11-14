# Build timeline.json from voice/dur.json (re-run after regenerating the voice).
import json
d=json.load(open('voice/dur.json')); L=json.load(open('lines.json'))
gap={'v01':.4,'v14':.25,'v15':.3}
chunks={
'v01':["What happens when computers","start using human brains?"],
'v02':["This is a biocomputer.","And you see,","those are real human neurons.","Alive. On a chip."],
'v03':["Where from?","Stem cells,","grown into neurons on the chip."],
'v04':["Under them, a grid","of 59 electrodes."],
'v05':["The silicon talks to them.","Pulses in.","Spikes out."],
'v06':["But neurons need a body.","So the box becomes one."],
'v07':["Pumps feed them.","Filters pull out waste.","Gas mixing lets them breathe.","Heat keeps body temperature."],
'v08':["They live up to six months."],
'v09':["But can they learn?","In 2022, about 800,000 neurons","in a dish","learned Pong."],
'v10':["Hit the ball?","Predictable feedback.","Miss? Random noise.","They learned to rally."],
'v11':["That was DishBrain.","Its successor, the CL1,","sells for $35,000."],
'v12':["Or rent one.","Swiss startup FinalSpark","streams 16 living mini-brains","online."],
'v13':["Why bother? Power.","Your brain runs on","about 20 watts.","AI data centers draw","hundreds of megawatts."],
'v14':["FinalSpark claims","a million times less energy.","Not proven yet."],
'v15':["Of course,","it can't think like you.","Yet.","But for the first time,","a computer is grown, not built."],
'v16':["What should we take apart next?"],
}
t=.35; vo=[]
for l in L:
    i=l['id']; vo.append({'id':i,'t':round(t,2),'chunks':chunks[i]}); t+=d[i]+gap.get(i,.16)
json.dump({'dur':round(t+2.2,1),'vo':vo},open('timeline.json','w'),indent=1)
print(round(t+2.2,1),[(v['id'],v['t']) for v in vo])
