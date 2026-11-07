# Build timeline.json from voice/dur.json (re-run after regenerating the voice).
import json
d=json.load(open('voice/dur.json')); L=json.load(open('lines.json'))
gap={'v01':.35,'v02':.25,'v03':.25,'v04':.3,'v05':.25,'v06':.3,'v07':.25,'v08':.3,'v09':.35,'v10':.9,'v11':.7,'v12':.9}
chunks={
'v01':["What's inside","an Olympic barbell?","Let's take one apart."],
'v02':["A men's competition bar:","20 kilos,","2.2 meters long."],
'v03':["The shaft: alloy steel,","28 millimeters thick,","rated around 190,000 PSI."],
'v04':["That's the stress that tears it apart.","Below its yield point,","it bends and springs straight back."],
'v05':["The knurl: crossed grooves","that leave tiny diamond points","to bite into chalked hands."],
'v06':["Rings mark your grip,","and the center knurl","keeps the bar on your shoulders."],
'v07':["Now the sleeves. They spin,","on bronze bushings,","or needle bearings that spin even faster."],
'v08':["In a snatch or clean,","the bar flips around your wrists","in a split second.","Spinning sleeves let the heavy plates","stay put while it turns."],
'v09':["Snap rings lock the sleeves on,","end caps seal them,","and collars clamp the plates."],
'v10':["Now load it heavy.","In the jerk dip, the bar bends,","stores energy like a spring,","and snaps back. That's whip."],
'v11':["So it's not just a steel stick.","It's a spring with spinning ends."],
'v12':["What should we take apart next?"],
'v13':["Congrats! You've discovered","the Olympic barbell."],
}
t=.4; vo=[]
for l in L:
    i=l['id']
    if i=='v11': import math; t=2*math.ceil(t/2-1e-6)   # payoff lands on a bar line (120 BPM, 2 s bars): the drop after the break
    vo.append({'id':i,'t':round(t,2),'chunks':chunks[i]}); t+=d[i]+gap.get(i,0)
json.dump({'dur':round(t+2.6,1),'vo':vo},open('timeline.json','w'),indent=1)
print(round(t+2.6,1),[(v['id'],v['t']) for v in vo])
