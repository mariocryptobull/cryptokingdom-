# Build timeline.json from voice/dur.json (re-run after regenerating the voice).
import json
d=json.load(open('voice/dur.json')); L=json.load(open('lines.json'))
gap={'v01':.45,'v02':.4,'v03':.4,'v04':.4,'v05':.6,'v06':.4,'v07':.4,'v08':.6,'v09':.45,'v10':.5,'v11':.6}
chunks={
'v01':["This is","Elon Musk's Neuralink.","A coin-sized implant","that listens to your brain."],
'v02':["Let's take it apart.","A sealed case holds","a small battery,","charged wirelessly through the skin."],
'v03':["Inside, a custom chip","processes the brain's tiny signals."],
'v04':["Below, 64 threads,","thinner than a hair,","carry 1,024 electrodes."],
'v05':["A surgical robot, R1,","inserts them one by one,","dodging blood vessels."],
'v06':["How does it work?","Think about moving your hand,","and neurons in your motor cortex fire."],
'v07':["Electrodes catch those spikes,","and the chip sends them","over Bluetooth to a computer."],
'v08':["Software decodes that pattern into intent,","and the cursor moves."],
'v09':["In early 2024,","the first participant,","paralyzed below the shoulders,","got the implant,","and was soon playing chess by thought."],
'v10':["By early 2026:","21 participants.","Some have moved a robotic arm.","Speech, and a vision implant called Blindsight,","are in development."],
'v11':["Neuralink's goal:","control phones and computers by thought.","Musk has even said you could one day","summon your Tesla with your mind."],
'v12':["What should we take apart next?"],
}
t=.4; vo=[]
for l in L:
    i=l['id']; vo.append({'id':i,'t':round(t,2),'chunks':chunks[i]}); t+=d[i]+gap.get(i,0)
json.dump({'dur':round(t+2.3,1),'vo':vo},open('timeline.json','w'),indent=1)
print(round(t+2.3,1),[(v['id'],v['t']) for v in vo])
