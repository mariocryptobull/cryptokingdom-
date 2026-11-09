# Build timeline.json from voice/dur.json (re-run after regenerating the voice).
import json
d=json.load(open('voice/dur.json')); L=json.load(open('lines.json'))
gap={'v01':.35,'v04':.35,'v05':.4,'v08':.35,'v09':.45,'v10':.3,'v11':.7,'v12':.45}
chunks={
'v01':["New York's subway","runs on two steel rails.","Let's take the track apart."],
'v02':["The running rails:","about 115 pounds of steel per yard,","4 feet 8½ inches apart."],
'v03':["Tie plates fix them","to wooden ties or concrete blocks,","on ballast or concrete."],
'v04':["Beside them, the third rail:","625 volts DC,","under a cover board."],
'v05':["A contact shoe on the truck","slides along it,","to power the traction motors."],
'v06':["The wheels aren't flat.","Each tread is a slight cone,","with a flange on the inside."],
'v07':["In a curve, the outer wheel","rides its wider part","and covers more ground.","The train steers itself."],
'v08':["All that weight sits","on contact patches","about the size of a dime."],
'v09':["The wheels also","short the two rails.","That track circuit tells the signals","a train is there."],
'v10':["That's why roof riding kills.","Tunnel ceilings sit","inches above the car.","Curves and braking throw you.","Below: 625 volts."],
'v11':["Six people died subway surfing","in 2024.","At least five in 2025.","Subway surfing kills.","Don't."],
'v12':["What should we take apart next?"],
'v13':["Congrats! You've discovered","how a subway train rides its rails."],
}
t=.4; vo=[]
for l in L:
    i=l['id']; vo.append({'id':i,'t':round(t,2),'chunks':chunks[i]}); t+=d[i]+gap.get(i,.25)
json.dump({'dur':round(t+2.2,1),'vo':vo},open('timeline.json','w'),indent=1)
print(round(t+2.2,1),[(v['id'],v['t']) for v in vo])
