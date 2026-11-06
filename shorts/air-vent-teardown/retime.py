# Build timeline.json from voice/dur.json (re-run after regenerating the voice).
import json
d=json.load(open('voice/dur.json')); L=json.load(open('lines.json'))
gap={'v01':.5,'v02':.4,'v03':.4,'v04':.35,'v05':.35,'v06':.4,'v07':.4,'v08':.5,'v09':.8,'v10':.6}
chunks={
'v01':["Why does the air from a vent","hug the ceiling?","Let's follow it","from the blower."],
'v02':["A spinning blower wheel","flings air outward,","building a pressure difference","of about half an inch of water.","Tiny, but enough","to push air through the house."],
'v03':["In the main duct, air moves","about 900 feet per minute.","Where the duct narrows,","it speeds up.","Where it widens, it slows,","and pressure climbs back."],
'v04':["Friction, and every elbow,","costs pressure.","Branch ducts run slower,","about 600 feet per minute."],
'v05':["At the diffuser,","angled vanes fling the stream","sideways, along the ceiling."],
'v06':["The fast jet drags air","out of the gap above it.","Pressure drops there,","and the jet gets pulled","onto the ceiling.","That's the Coanda effect."],
'v07':["Then it breaks into","turbulent eddies,","mixing and slowing.","Engineers size it to drop","below 50 feet per minute","by the end of its throw."],
'v08':["By the time it reaches you,","it's a gentle draft,","under 40 feet per minute.","Warm air rises,","cool air sinks."],
'v09':["That's why it hugs the ceiling:","a fast jet,","a low-pressure gap,","and a surface to cling to."],
'v10':["What should we","take apart next?"],
'v11':["Congrats! You've discovered","how air flows through a vent."],
}
t=.4; vo=[]
for l in L:
    i=l['id']; vo.append({'id':i,'t':round(t,2),'chunks':chunks[i]}); t+=d[i]+gap.get(i,0)
json.dump({'dur':round(t+2.4,1),'vo':vo},open('timeline.json','w'),indent=1)
print(round(t+2.4,1),[(v['id'],v['t']) for v in vo])
