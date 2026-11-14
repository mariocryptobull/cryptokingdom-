# Build timeline.json from voice/dur.json (re-run after regenerating the voice).
import json
d=json.load(open('voice/dur.json')); L=json.load(open('lines.json'))
gap={'v01':.4,'v02':.5,'v03':.15,'v04':.15,'v05':.2,'v06':.15,'v07':.15,'v08':.3,'v09':.2,'v10':.15,'v11':.8,'v12':.6}
chunks={
'v01':["How will robots","rise to power?"],
'v02':["This is","Elon Musk's Optimus.","And you see,","it wasn't built to rule.","It was built to work."],
'v03':["So what's inside?","28 actuators.","Six designs.","Three rotary,","three linear."],
'v04':["Rotary ones","twist the joints.","Linear ones push,","like muscles."],
'v05':["And inside those?","Planetary roller screws.","One lifted","a half-tonne piano."],
'v06':["The hands?","22 degrees of freedom.","Double the first version."],
'v07':["Power?","A 2.3 kWh pack,","right in the torso."],
'v08':["Eyes?","Autopilot cameras.","Brain?","Tesla's self-driving computer."],
'v09':["How does it learn?","Humans show it.","Suits, cameras, real tasks.","Then it practises","in simulation."],
'v10':["The plan?","Tesla's factories first.","Then other companies.","Homes, later."],
'v11':["The goals?","A line built for","20,000 a week.","And a price of","$20–30 thousand."],
'v12':["Of course,","they won't rise to power.","But it's beautiful to watch","the rise of robots","in our lifetime."],
'v13':["What should we","take apart next?"],
}
t=.4; vo=[]
for l in L:
    i=l['id']; vo.append({'id':i,'t':round(t,2),'chunks':chunks[i]}); t+=d[i]+gap.get(i,0)
json.dump({'dur':round(t+3.0,1),'vo':vo},open('timeline.json','w'),indent=1)
print(round(t+3.0,1),[(v['id'],v['t']) for v in vo])
