# Build timeline.json from voice/dur.json (re-run after regenerating the voice).
import json
d=json.load(open('voice/dur.json')); L=json.load(open('lines.json'))
gap={'v01':.45,'v02':.35,'v03':.35,'v04':.45,'v05':.9,'v06':.3,'v07':.4,'v08':1.0,'v09':.55,'v10':.5,'v11':.7}
chunks={
'v01':["Thousands of cars burning gasoline,","in a tube under a river.","How does the Holland Tunnel breathe?"],
'v02':["Opened in 1927,","it runs over a mile and a half","under the Hudson,","New Jersey to Manhattan."],
'v03':["The killer was carbon monoxide.","Tests at Yale and the Bureau of Mines","found just four parts in ten thousand","was dangerous."],
'v04':["Chief engineer Clifford Holland","died in 1924, before it opened.","Ole Singstad designed the ventilation,","and finished it."],
'v05':["His answer:","split the tube into three layers."],
'v06':["Fans blow fresh air","into a duct under the roadway.","It rises through slots along the curb."],
'v07':["Dirty air is pulled up","through vents in the ceiling,","into an exhaust duct above, and out."],
'v08':["Four ventilation buildings,","two on land and two out in the river,","hold eighty-four fans.","Forty-two blow in. Forty-two pull out."],
'v09':["Together, they can replace","all the air in the tunnel","every ninety seconds."],
'v10':["It was the world's first","mechanically ventilated tunnel.","Today it's a National Historic Landmark."],
'v11':["What should we take apart next?"],
'v12':["Congrats! You've discovered","how the Holland Tunnel breathes."],
}
t=.4; vo=[]
for l in L:
    i=l['id']; vo.append({'id':i,'t':round(t,2),'chunks':chunks[i]}); t+=d[i]+gap.get(i,0)
json.dump({'dur':round(t+2.1,1),'vo':vo},open('timeline.json','w'),indent=1)
print(round(t+2.1,1),[(v['id'],v['t']) for v in vo])
