"""Numerical check of the textbook-problem solutions (White 9th ed. properties, Table A.3)."""
from math import pi, sqrt, log10, atan2, degrees, cos, sin, radians
g=9.81; rw=998.0; mw=1.0e-3; nw=mw/rw; gw=rw*g
def cole(Re,eD,f=0.02):
    for _ in range(200): f=(-2*log10(eD/3.7+2.51/(Re*sqrt(f))))**-2
    return f
R={}
# P3.117
R['3.117']=dict(H=0.85+75000/gw)
# P3.121 CO2
rho=170000/(189*293.15); rm=0.827*rw; dp=(rm-rho)*g*0.08; b=0.6
V2=sqrt(2*dp/(rho*(1-b**4))); Q=V2*pi*0.06**2/4
R['3.121']=dict(rho=rho,rm=rm,dp=dp,p2=170000-dp,V2=V2,V1=V2*b*b,Q=Q,Qh=Q*3600)
# P3.126 BG kerosene rho=1.56 slug/ft3
rk=1.56; dpb=(20-14.7)*144; h=5; A=pi*(1/12)**2/4
Va=sqrt(2*(dpb/rk+32.2*h)); Vb=Va/sqrt(5.5)
R['3.126']=dict(dp=dpb,Va=Va,Qa=Va*A,Vb=Vb,Qb=Vb*A,Qa_SI=Va*A*0.0283168,Qb_SI=Vb*A*0.0283168)
# P4.3
x,y=1,2;u=x*x-y*y+x;v=-(2*x*y+y);ux=2*x+1;uy=-2*y;vx=-2*y;vy=-(2*x+1)
ax=u*ux+v*uy;ay=u*vx+v*vy
R['4.3']=dict(u=u,v=v,ax=ax,ay=ay,V40=u*cos(radians(40))+v*sin(radians(40)),thV=degrees(atan2(v,u))%360,Vmag=sqrt(u*u+v*v),tha=degrees(atan2(ay,ax)),amag=sqrt(ax*ax+ay*ay))
# P4.17
R['4.17']=dict(vmax=0.15*3*0.011/1)
# P5.66
rs=1025; pv=2337; pa=101000
Ca=(pa+rs*g*8-pv)/(0.5*rs*21**2)
V20=sqrt(2*(pa+rs*g*20-pv)/(rs*Ca)); h30=(Ca*0.5*rs*30**2+pv-pa)/(rs*g)
R['5.66']=dict(Ca=Ca,V20=V20,h30=h30)
# P5.71
rg=680; Eu=5000/(rw*4**2); Vp=sqrt(15000/(rg*Eu)); Qp=9/60
R['5.71']=dict(Eu=Eu,Vp=Vp,Dp=sqrt(4*Qp/(pi*Vp)))
# P6.11
dp=(13550-rw)*g*0.135+gw*3; hf=dp/gw-3; f=hf*(0.06/5)*(2*g/16)
R['6.11']=dict(dp=dp,hf=hf,hf_alt=(13550/rw-1)*0.135,f=f,Re=4*0.06/nw)
# P6.14
Vlam=2300*nw/0.002; bcoef=32*mw*1/(rw*g*0.002**2); a=1/(2*g)
Hlam=a*Vlam**2+bcoef*Vlam
V=(-bcoef+sqrt(bcoef**2+4*a*0.5))/(2*a); Q=V*pi*0.002**2/4
R['6.14']=dict(Vlam=Vlam,Hlam=Hlam,b=bcoef,V=V,Q=Q,QLh=Q*3.6e6,Re=V*0.002/nw)
# P6.41
Q=130/gw; A=pi*0.08**2/4; V=Q/A; Re=V*0.08/nw; freq=40*(0.08/350)*(2*g/V**2)
s=1/sqrt(freq); eD=3.7*(10**(-s/2)-2.51/(Re*sqrt(freq)))
mats={'galvanized':0.15e-3,'commercial steel':0.046e-3,'cast iron':0.26e-3}
out={}
for m,e in mats.items():
    f=0.02
    for _ in range(50):
        Vm=sqrt(2*g*40*0.08/(f*350)); f=cole(Vm*0.08/nw,e/0.08)
    out[m]=dict(f=f,V=Vm,Q=Vm*A,W=gw*Vm*A)
R['6.41']=dict(Q=Q,V=V,Re=Re,f_allow=freq,eps_allow_mm=eD*80,mats=out)
# P6.44 mercury
rh,mh=13550,1.56e-3; D=0.007;L=4;V=5;Re=rh*V*D/mh;f=cole(Re,0);hf=f*L/D*V*V/(2*g)
R['6.44']=dict(Re=Re,f=f,hf=hf,dp=rh*g*hf)
# P6.62 BG
rb,mb=1.94,2.09e-5;Q=3;D=0.5;L=2000;e=0.00085;A=pi*D*D/4;V=Q/A;Re=rb*V*D/mb;f=cole(Re,e/D);hf=f*L/D*V*V/(2*32.2)
hp=120+hf;P=62.4*Q*hp/0.75
R['6.62']=dict(V=V,Re=Re,eD=e/D,f=f,hf=hf,hp=hp,P_ftlbf=P,P_hp=P/550)
import json;print(json.dumps(R,indent=1))
