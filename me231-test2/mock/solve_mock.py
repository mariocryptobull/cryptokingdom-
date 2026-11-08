"""Numerical check of the mock exam answers."""
from math import pi, sqrt, log10
g=9.81; rho=998; mu=1e-3; nu=mu/rho; gam=rho*g
def cole(Re,eD,f=0.02):
    for _ in range(200): f=(-2*log10(eD/3.7+2.51/(Re*sqrt(f))))**-2
    return f
R={}
# Q1 Couette-Poiseuille
mo,ro,h,U=0.40,900,0.005,2.0
G=6*mo*U/h**2                      # dp/dx for zero net flow
tau0=mo*U/h - G*h/2; tauh=mo*U/h + G*h/2
y=h/2 - mo*U/(h*G)                 # du/dy=0
umin=U*y/h + G/(2*mo)*(y*y-h*y)
R['Q1']=dict(dpdx=G,tau_bottom=tau0,tau_top=tauh,y_min=y,umin=umin,q_check=U*h/2-G*h**3/(12*mo))
# Q2 reservoir outlet
Cc=0.61; Dp,hp=1.2,15
Qp=Cc*pi*Dp**2/4*sqrt(2*g*hp); C=Cc*pi/4*sqrt(2)
Lr=20; Dm,hm=Dp/Lr,hp/Lr; Qm=Cc*pi*Dm**2/4*sqrt(2*g*hm); Vm=sqrt(2*g*hm)
R['Q2']=dict(C=C,Qp=Qp,Qm=Qm,Qm_scaled=Qp/Lr**2.5,Vm=Vm,Rem=Vm*Dm/nu,Pi3_m=mu/(rho*sqrt(g)*Dm**1.5),tp=12*sqrt(Lr))
# Q3 reservoir-pipe-free jet
H,L,D,e,K=12,40,0.04,0.046e-3,0.5
f=0.02
for _ in range(60):
    V=sqrt(2*g*H/(1+K+f*L/D)); f=cole(V*D/nu,e/D)
V=sqrt(2*g*H/(1+K+f*L/D)); Q=V*pi*D*D/4
tw=f*rho*V*V/8; pmid=gam*f*(20/D)*V*V/(2*g)
V2=2*V; f2=cole(V2*D/nu,e/D); hp=V2**2/(2*g)*(1+K+f2*L/D)-H; P=gam*2*Q*hp/0.70
R['Q3']=dict(V=V,Re=V*D/nu,f=f,Q=Q,QLs=Q*1000,tw=tw,pmid=pmid,f2=f2,Re2=V2*D/nu,hp=hp,P=P)
import json;print(json.dumps(R,indent=1))
