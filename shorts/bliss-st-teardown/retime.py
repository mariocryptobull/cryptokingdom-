# Build timeline.json from voice/dur.json (re-run after regenerating the voice).
import json
d=json.load(open('voice/dur.json')); L=json.load(open('lines.json'))
gap={'v01':.6,'v02':.45,'v03':.45,'v04':.5,'v05':.45,'v06':.9,'v07':1.0,'v08':.5,'v09':.55,'v10':.7}
chunks={
'v01':["How was this","train station built?","46 St–Bliss St stands","on a concrete bridge","from 1917."],
'v02':["It started with","the Dual Contracts of 1913:","a plan to push the subway","into Queens."],
'v03':["The city wanted","Queens Boulevard beautiful.","So instead of a steel el,","engineers chose","reinforced concrete arches."],
'v04':["Footings went in first.","Then crews poured concrete piers","into wooden forms,","around the clock."],
'v05':["Arches tied the piers together.","Steel girders carried a deck","for three tracks,","with an express in the middle."],
'v06':["Then the station:","two side platforms,","canopies,","and station houses","tucked inside the viaduct."],
'v07':["On April 21, 1917,","the 7 train rolled in."],
'v08':["In the fifties, the platforms grew","for longer trains.","But water seeped","through the track bed,","and the concrete crumbled."],
'v09':["From 1993 to '97,","the viaduct was rebuilt:","40,000 tons of concrete,","new canopies,","and stained glass."],
'v10':["In 2018,","computer signals took over.","Now it's being rebuilt again,","with temporary platforms","and two new elevators."],
'v11':["So, no grave yet.","Congrats! You've discovered","how 46 St–Bliss St","was built."],
}
t=.4; vo=[]
for l in L:
    i=l['id']; vo.append({'id':i,'t':round(t,2),'chunks':chunks[i]}); t+=d[i]+gap.get(i,0)
json.dump({'dur':round(t+2.4,1),'vo':vo},open('timeline.json','w'),indent=1)
print(round(t+2.4,1),[(v['id'],v['t']) for v in vo])
