"""Numerical check of every practice-problem answer in the ME231 Test 2 packet."""
from math import pi, sqrt, log10
g=9.81; rho=998.0; mu=1.0e-3; nu=mu/rho; gam=rho*g
def colebrook(Re, eD):
    f=0.02
    for _ in range(100):
        f=(-2*log10(eD/3.7+2.51/(Re*sqrt(f))))**-2
    return f
def haaland(Re,eD): return (-1.8*log10((eD/3.7)**1.11+6.9/Re))**-2
R={}
# P1 kinematics, a=2 1/s at (1,1)
a=2;x=y=1
u=a*(x*x-y*y); v=-2*a*x*y
ax=u*2*a*x+v*(-2*a*y); ay=u*(-2*a*y)+v*(-2*a*x)
R['P1']=dict(u=u,v=v,ax=ax,ay=ay,amag=sqrt(ax**2+ay**2),dpdx=-rho*ax,dpdy=-rho*ay)
# P2 plates
muo=0.29; rhoo=891; h=0.002; G=1500
umax=G*h*h/(2*muo); Vavg=2/3*umax
R['P2']=dict(umax=umax,Vavg=Vavg,q=2*h*Vavg,tau=G*h,Re=rhoo*Vavg*2*h/muo)
# P3 siphon
V=sqrt(2*g*3); pg=-gam*(1.5+3); pa=101350+pg
hmax=(101350-2337)/gam-3
R['P3']=dict(V=V,Q=V*pi*0.04**2/4,ptop_gage=pg,ptop_abs=pa,hmax=hmax)
# P4 venturi
dp=(13550-rho)*g*0.20; b=0.5
V2=sqrt(2*dp/(rho*(1-b**4))); Q=V2*pi*0.05**2/4
R['P4']=dict(dp=dp,V2=V2,V1=V2*b*b,Q=Q)
# P6 similarity
rp,mp_=1025,1.07e-3; rm,mm=998,1.0e-3; Vp=15; Lr=5
Vm=Vp*(rp/rm)*(mm/mp_)*Lr; Fm=1500
Fp=Fm*(rp/rm)*(Vp/Vm)**2*Lr**2
R['P6']=dict(Vm=Vm,Fp=Fp,Pp=Fp*Vp)
# P7 laminar
ro,muo=900,0.18; D=0.03; Q=5e-4; L=20
A=pi*D*D/4; V=Q/A; Re=ro*V*D/muo; f=64/Re; hf=f*L/D*V*V/(2*g)
R['P7']=dict(V=V,Re=Re,f=f,hf=hf,dp=ro*g*hf,dpHP=128*muo*L*Q/(pi*D**4),tauw=ro*g*hf*D/(4*L))
# P8 turbulent type 1
D=0.10;L=150;Q=0.02;eps=0.26e-3;dz=10
V=Q/(pi*D*D/4); Re=V*D/nu; f=colebrook(Re,eps/D); hf=f*L/D*V*V/(2*g)
R['P8']=dict(V=V,Re=Re,eD=eps/D,f=f,fH=haaland(Re,eps/D),hf=hf,dp=gam*(hf+dz))
# P9 type 2
D=0.05;L=50;hf=8;eps=0.046e-3
f=0.02;it=[]
for i in range(6):
    V=sqrt(2*g*hf*D/(f*L)); Re=V*D/nu; fn=colebrook(Re,eps/D); it.append((f,V,Re,fn)); f=fn
V=sqrt(2*g*hf*D/(f*L))
R['P9']=dict(iters=it,V=V,Re=V*D/nu,f=f,Q=V*pi*D*D/4)
# P10 system
D=0.08;L=100;eps=0.046e-3;dz=20;K=0.5+2*0.3+0.15+1.0
f=0.02;it=[]
for i in range(6):
    V=sqrt(2*g*dz/(f*L/D+K)); Re=V*D/nu; fn=colebrook(Re,eps/D); it.append((f,V,Re,fn)); f=fn
V=sqrt(2*g*dz/(f*L/D+K))
R['P10']=dict(K=K,iters=it,V=V,Re=V*D/nu,f=f,Q=V*pi*D*D/4,hmajor=f*L/D*V*V/2/g,hminor=K*V*V/2/g)
import json; print(json.dumps(R,indent=1,default=str))
