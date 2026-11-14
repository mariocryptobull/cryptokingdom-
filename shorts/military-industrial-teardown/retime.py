# Build timeline.json from voice/dur.json (re-run after regenerating the voice).
import json
d=json.load(open('voice/dur.json')); L=json.load(open('lines.json'))
gap={'v01':.4,'v02':.18,'v03':.15,'v04':.15,'v05':.15,'v06':.15,'v07':.15,'v08':.15,'v09':.15,'v10':.15,'v11':.2}
chunks={
'v01':["Who really profits","from war?"],
'v02':["This is the","military-industrial complex.","And you see, a president","warned us about it in 1961.","A general, no less."],
'v03':["Dwight Eisenhower.","Five-star general.","His farewell warning?","Guard against unwarranted influence,","by the military-industrial complex."],
'v04':["Where did it start?","World War Two.","Car plants built bombers.","Willow Run:","one B-24 an hour."],
'v05':["Then the Cold War arms race.","Its spin-offs?","Jet engines. Satellites.","GPS.","ARPANET, the internet's ancestor."],
'v06':["Today?","World military spending:","$2.9 trillion.","A record, says SIPRI."],
'v07':["Who gets the contracts?","The top 100 arms makers:","$679 billion.","Lockheed Martin leads."],
'v08':["Now explode one fighter jet.","Engine. Radar.","Wings. Chips.","The F-35 alone?","Over 1,900 suppliers."],
'v09':["And the climate?","Militaries: maybe 5.5%","of global emissions.","An estimate.","Reporting is voluntary."],
'v10':["The new race?","Drones and AI.","Ukraine built about","4 million drones in 2025."],
'v11':["Of course, the same machine","also built GPS and the internet.","Eisenhower's question still stands:","who's steering it?"],
'v12':["What should we","take apart next?"],
}
t=.2; vo=[]
for l in L:
    i=l['id']; vo.append({'id':i,'t':round(t,2),'chunks':chunks[i]}); t+=d[i]+gap.get(i,0)
json.dump({'dur':round(t+1.7,1),'vo':vo},open('timeline.json','w'),indent=1)
print(round(t+1.7,1),[(v['id'],v['t']) for v in vo])
