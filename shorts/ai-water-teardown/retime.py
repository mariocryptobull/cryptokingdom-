# Build timeline.json from voice/dur.json (re-run after regenerating the voice).
import json
d=json.load(open('voice/dur.json')); L=json.load(open('lines.json'))
gap={'v01':.4,'v02':.2,'v07':.2,'v08':.2,'v09':.2,'v11':.2,'v12':.25,'v13':.2}
DG=.15
chunks={
'v01':["Is AI drinking","the planet dry?"],
'v02':["This is an AI data center.","And you see, its chips","run so hot","they have to drink to survive."],
'v03':["Inside: racks of GPUs.","One rack pulls","120 kilowatts."],
'v04':["Air can't keep up.","So the cooling goes","straight to the chip."],
'v05':["Cold plates","sit on every GPU.","Coolant flows through,","and carries the heat away."],
'v06':["That loop dumps its heat","into a chiller.","Then up to the roof."],
'v07':["Cooling towers.","This is where water is lost.","It evaporates,","and the heat leaves as vapour."],
'v08':["How much?","Operators measure","litres per kilowatt-hour.","Amazon reports 0.15.","Microsoft, 0.27."],
'v09':["But that's only half the bill.","Power plants drink too.","In America, that hidden water","is 12 times bigger."],
'v10':["So, one prompt?","Google says","about five drops."],
'v11':["One big data center?","Up to five million gallons","a day."],
'v12':["The fixes?","Closed loops","that never evaporate.","Dry coolers instead of towers.","And cooler climates."],
'v13':["Of course, one question","won't drain a river.","But billions a day?","That adds up."],
'v14':["What should we","take apart next?"],
}
t=.3; vo=[]
for l in L:
    i=l['id']; vo.append({'id':i,'t':round(t,2),'chunks':chunks[i]}); t+=d[i]+gap.get(i,DG)
json.dump({'dur':round(t+2.2,1),'vo':vo},open('timeline.json','w'),indent=1)
print(round(t+2.2,1),[(v['id'],v['t']) for v in vo])
