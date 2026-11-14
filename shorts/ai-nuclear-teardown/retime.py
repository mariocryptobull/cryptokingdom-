# Build timeline.json from voice/dur.json (re-run after regenerating the voice).
import json
d=json.load(open('voice/dur.json')); L=json.load(open('lines.json'))
gap={'v01':.4,'v02':.15,'v04':.15,'v10':.12,'v11':.15,'v12':.15,'v16':.2,'v17':.2}
chunks={
'v01':["Will AI bring about","nuclear disaster?"],
'v02':["This is Three Mile Island,","home of America's","worst nuclear accident.","And you see, AI is","bringing it back to life."],
'v03':["Microsoft signed","a 20-year deal","to restart Unit 1."],
'v04':["Why?","Let's take it apart."],
'v05':["Uranium pellets","in fuel rods split atoms.","That makes heat."],
'v06':["Control rods","soak up neutrons.","Slide them in, it slows."],
'v07':["The pressure vessel keeps","the water from boiling."],
'v08':["Hot water loops","to the steam generator,","and boils a second loop."],
'v09':["Steam spins the turbine,","which spins the generator."],
'v10':["Cooling towers dump","the leftover heat."],
'v11':["Heat, steam, spin, power.","Then, GPUs."],
'v12':["835 megawatts,","24/7,","carbon-free."],
'v13':["Why now?","AI is hungry."],
'v14':["In 2023, data centers used","4.4% of US power.","2028?","Up to 12."],
'v15':["Google and Amazon plan","small modular reactors:","Google's first by 2030,","Amazon 5 gigawatts by 2039."],
'v16':["The catch?","$1.6 billion to restart,","years to build new ones,","and waste with no permanent home."],
'v17':["Of course,","AI won't cause a meltdown.","But the future of AI","might run on a plant from the past."],
'v18':["What should we","take apart next?"],
}
t=.3; vo=[]
for l in L:
    i=l['id']; vo.append({'id':i,'t':round(t,2),'chunks':chunks[i]}); t+=d[i]+gap.get(i,.12)
json.dump({'dur':round(t+1.6,1),'vo':vo},open('timeline.json','w'),indent=1)
print(round(t+1.6,1),[(v['id'],v['t']) for v in vo])
