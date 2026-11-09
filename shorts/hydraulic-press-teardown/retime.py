# Build timeline.json from voice/dur.json (re-run after regenerating the voice).
import json
d=json.load(open('voice/dur.json')); L=json.load(open('lines.json'))
gap={'v01':.45,'v02':.35,'v03':.35,'v04':.4,'v05':.35,'v06':.35,'v07':.4,'v08':.35,'v09':.35,'v10':1.6,'v11':.5}
chunks={
'v01':["How does a hydraulic press","crush almost anything?","Your arm pushes.","The oil multiplies."],
'v02':["Here's a 20-ton shop press,","taken apart:","frame, hand pump, oil reservoir,","and one big cylinder."],
'v03':["Lift the handle:","a small piston sucks in oil","through a check valve.","Push down: it's forced out","through a second one."],
'v04':["It can't flow back,","so every stroke stacks more oil","on the big piston:","the ram."],
'v05':["Pascal's law:","squeeze a trapped liquid,","and the pressure is equal everywhere.","Force is pressure × area."],
'v06':["Pump piston:","7/16 of an inch wide.","Ram: 2¼ inches.","26 times the area."],
'v07':["The handle turns a 90-lb pull","into 1,500 lb","on the small piston:","10,000 psi.","On the ram, 40,000 lb.","Twenty tons."],
'v08':["The catch?","Each stroke moves the ram","about a millimeter.","You trade distance for force."],
'v09':["A gauge reads the pressure.","A release valve","lets the oil drain back."],
'v10':["And a soda can?","It buckles at about 200 lb.","Half a percent","of this press."],
'v11':["What should we take apart next?"],
'v12':["Congrats! You've discovered","the hydraulic press."],
}
t=.4; vo=[]
for l in L:
    i=l['id']; vo.append({'id':i,'t':round(t,2),'chunks':chunks[i]}); t+=d[i]+gap.get(i,0)
json.dump({'dur':round(t+2.2,1),'vo':vo},open('timeline.json','w'),indent=1)
print(round(t+2.2,1),[(v['id'],v['t']) for v in vo])
