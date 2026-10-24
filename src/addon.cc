/**
 * swisseph-node — N-API binding for the Swiss Ephemeris.
 *
 * A thin, faithful wrapper over the upstream C API (swephexp.h).
 * The upstream sources are compiled unmodified; all sugar lives in lib/*.js.
 */
#include <napi.h>
#include <string>
#include <cstring>
#include "swephexp.h"

static char g_serr[512];

// swe_version() -> string
static Napi::Value Version(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  char buf[256];
  swe_version(buf);
  return Napi::String::New(env, buf);
}

// swe_set_ephe_path(path)
static Napi::Value SetEphePath(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "setEphePath(path: string) expected").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string path = info[0].As<Napi::String>().Utf8Value();
  swe_set_ephe_path(path.empty() ? nullptr : path.c_str());
  return env.Undefined();
}

// swe_set_topo(lon, lat, alt)
static Napi::Value SetTopo(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 3) {
    Napi::TypeError::New(env, "setTopo(lon, lat, alt) expected").ThrowAsJavaScriptException();
    return env.Null();
  }
  swe_set_topo(info[0].As<Napi::Number>().DoubleValue(),
               info[1].As<Napi::Number>().DoubleValue(),
               info[2].As<Napi::Number>().DoubleValue());
  return env.Undefined();
}

// swe_julday(year, month, day, hour, gregflag) -> number
static Napi::Value JulDay(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  double jd = swe_julday(info[0].As<Napi::Number>().Int32Value(),
                         info[1].As<Napi::Number>().Int32Value(),
                         info[2].As<Napi::Number>().Int32Value(),
                         info[3].As<Napi::Number>().DoubleValue(),
                         info[4].As<Napi::Number>().Int32Value());
  return Napi::Number::New(env, jd);
}

// swe_revjul(jd, gregflag) -> {year, month, day, hour}
static Napi::Value RevJul(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  int y, m, d;
  double h;
  swe_revjul(info[0].As<Napi::Number>().DoubleValue(),
             info[1].As<Napi::Number>().Int32Value(), &y, &m, &d, &h);
  Napi::Object out = Napi::Object::New(env);
  out.Set("year", y);
  out.Set("month", m);
  out.Set("day", d);
  out.Set("hour", h);
  return out;
}

// swe_utc_to_jd(y, m, d, h, mi, s, gregflag) -> {jdEt, jdUt}
static Napi::Value UtcToJd(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  double dret[2];
  memset(g_serr, 0, sizeof(g_serr));
  int32 r = swe_utc_to_jd(info[0].As<Napi::Number>().Int32Value(),
                          info[1].As<Napi::Number>().Int32Value(),
                          info[2].As<Napi::Number>().Int32Value(),
                          info[3].As<Napi::Number>().Int32Value(),
                          info[4].As<Napi::Number>().Int32Value(),
                          info[5].As<Napi::Number>().DoubleValue(),
                          info[6].As<Napi::Number>().Int32Value(),
                          dret, g_serr);
  if (r < 0) {
    Napi::Error::New(env, g_serr).ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::Object out = Napi::Object::New(env);
  out.Set("jdEt", dret[0]);
  out.Set("jdUt", dret[1]);
  return out;
}

// swe_utc_time_zone(y,m,d,h,mi,s, tzHours) -> {y,m,d,h,mi,s} in UTC
static Napi::Value UtcTimeZone(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  int32 oy, om, od, oh, omi;
  double os;
  swe_utc_time_zone(info[0].As<Napi::Number>().Int32Value(),
                    info[1].As<Napi::Number>().Int32Value(),
                    info[2].As<Napi::Number>().Int32Value(),
                    info[3].As<Napi::Number>().Int32Value(),
                    info[4].As<Napi::Number>().Int32Value(),
                    info[5].As<Napi::Number>().DoubleValue(),
                    info[6].As<Napi::Number>().DoubleValue(),
                    &oy, &om, &od, &oh, &omi, &os);
  Napi::Object out = Napi::Object::New(env);
  out.Set("year", oy);
  out.Set("month", om);
  out.Set("day", od);
  out.Set("hour", oh);
  out.Set("minute", omi);
  out.Set("second", os);
  return out;
}

// swe_deltat(jdUt) -> seconds
static Napi::Value DeltaT(const Napi::CallbackInfo& info) {
  return Napi::Number::New(info.Env(),
      swe_deltat(info[0].As<Napi::Number>().DoubleValue()));
}

// swe_calc_ut(jdUt, planet, flags) ->
//   {lon, lat, dist, lonSpeed, latSpeed, distSpeed, rflag}  (degrees; NaN when N/A)
static Napi::Value CalcUt(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  double xx[6];
  memset(g_serr, 0, sizeof(g_serr));
  int32 r = swe_calc_ut(info[0].As<Napi::Number>().DoubleValue(),
                        info[1].As<Napi::Number>().Int32Value(),
                        info[2].As<Napi::Number>().Int32Value(),
                        xx, g_serr);
  if (r < 0) {
    Napi::Error::New(env, g_serr[0] ? g_serr : "swe_calc_ut failed").ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::Object out = Napi::Object::New(env);
  out.Set("lon", xx[0]);
  out.Set("lat", xx[1]);
  out.Set("dist", xx[2]);
  out.Set("lonSpeed", xx[3]);
  out.Set("latSpeed", xx[4]);
  out.Set("distSpeed", xx[5]);
  out.Set("rflag", r);
  if (g_serr[0]) out.Set("warning", std::string(g_serr));
  return out;
}

// swe_houses(jdUt, lat, lon, hsysChar, flags?) ->
//   {cusps: number[13] (index 1..12; up to 36 for G/K), ascmc: number[10]}
static Napi::Value Houses(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  double cusps[37];
  double ascmc[10];
  memset(g_serr, 0, sizeof(g_serr));
  std::string hsys = info[3].As<Napi::String>().Utf8Value();
  if (hsys.empty()) {
    Napi::TypeError::New(env, "houseSystem must be a non-empty string like 'P'").ThrowAsJavaScriptException();
    return env.Null();
  }
  int32 flags = info.Length() > 4 && info[4].IsNumber() ? info[4].As<Napi::Number>().Int32Value() : 0;
  int r = swe_houses_ex(info[0].As<Napi::Number>().DoubleValue(),
                        flags,
                        info[1].As<Napi::Number>().DoubleValue(),
                        info[2].As<Napi::Number>().DoubleValue(),
                        hsys[0], cusps, ascmc);
  if (r < 0) {
    Napi::Error::New(env, "swe_houses failed").ThrowAsJavaScriptException();
    return env.Null();
  }
  // For G/K there are 36 cusps; use swe_houses(...) return value heuristic:
  int ncusps = 12;
  char h = hsys[0];
  if (h == 'G' || h == 'g' || h == 'K' || h == 'k' || h == 'H' || h == 'h' || h == 'I' || h == 'i') {
    // swe_houses_ex returns number of cusps for these systems in `r` when >= 0?
    // Upstream: returns 12 normally; for variable systems use 36.
    ncusps = 36;
  }
  Napi::Array cuspsArr = Napi::Array::New(env, ncusps);
  for (int i = 1; i <= ncusps; i++) cuspsArr[i - 1] = cusps[i];
  Napi::Array ascmcArr = Napi::Array::New(env, 10);
  for (int i = 0; i < 10; i++) ascmcArr[i] = ascmc[i];
  Napi::Object out = Napi::Object::New(env);
  out.Set("cusps", cuspsArr);
  out.Set("ascmc", ascmcArr);
  return out;
}

// swe_get_planet_name(ipl) -> string
static Napi::Value GetPlanetName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  char name[64];
  swe_get_planet_name(info[0].As<Napi::Number>().Int32Value(), name);
  return Napi::String::New(env, name);
}

// swe_get_ayanamsa_ut(jdUt) -> degrees
static Napi::Value AyanamsaUt(const Napi::CallbackInfo& info) {
  return Napi::Number::New(info.Env(),
      swe_get_ayanamsa_ut(info[0].As<Napi::Number>().DoubleValue()));
}

// swe_azalt(jdUt, calcFlag, geopos[3], atpress, attemp, xin[2]) -> {azimuthTrue, altitude, azimuthApparent}
static Napi::Value AzAlt(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  double geopos[3] = {0, 0, 0};
  double xin[3] = {0, 0, 0};
  double xaz[3];
  Napi::Array geo = info[2].As<Napi::Array>();
  for (int i = 0; i < 3 && i < (int)geo.Length(); i++) geopos[i] = geo.Get(i).As<Napi::Number>().DoubleValue();
  Napi::Array x = info[5].As<Napi::Array>();
  for (int i = 0; i < 3 && i < (int)x.Length(); i++) xin[i] = x.Get(i).As<Napi::Number>().DoubleValue();
  swe_azalt(info[0].As<Napi::Number>().DoubleValue(),
            info[1].As<Napi::Number>().Int32Value(),
            geopos,
            info[3].As<Napi::Number>().DoubleValue(),
            info[4].As<Napi::Number>().DoubleValue(),
            xin, xaz);
  Napi::Object out = Napi::Object::New(env);
  out.Set("azimuthTrue", xaz[0]);
  out.Set("altitude", xaz[1]);
  out.Set("azimuthApparent", xaz[2]);
  return out;
}

// swe_pheno_ut(jdUt, ipl, flags) -> {phaseAngle, phase,elongation, magDiam[4], rflag}
static Napi::Value PhenoUt(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  double attr[20];
  memset(g_serr, 0, sizeof(g_serr));
  int32 r = swe_pheno_ut(info[0].As<Napi::Number>().DoubleValue(),
                         info[1].As<Napi::Number>().Int32Value(),
                         info[2].As<Napi::Number>().Int32Value(),
                         attr, g_serr);
  if (r < 0) {
    Napi::Error::New(env, g_serr[0] ? g_serr : "swe_pheno_ut failed").ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::Object out = Napi::Object::New(env);
  out.Set("phaseAngle", attr[0]);
  out.Set("phaseIllumination", attr[1]);
  out.Set("elongation", attr[2]);
  out.Set("apparentDiameter", attr[3]);
  out.Set("apparentMagnitude", attr[4]);
  out.Set("rflag", r);
  return out;
}

// swe_sol_eclipse_when_loc(jdStart, flags, geopos[3]) ->
//   {jdMax, attr[11]} or null when none found in search window
static Napi::Value SolEclipseWhenLoc(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  double geopos[3] = {0, 0, 0};
  Napi::Array geo = info[2].As<Napi::Array>();
  for (int i = 0; i < 3 && i < (int)geo.Length(); i++) geopos[i] = geo.Get(i).As<Napi::Number>().DoubleValue();
  double tret[10];
  double attr[20];
  memset(g_serr, 0, sizeof(g_serr));
  int32 r = swe_sol_eclipse_when_loc(info[0].As<Napi::Number>().DoubleValue(),
                                     info[1].As<Napi::Number>().Int32Value(),
                                     geopos, tret, attr, 0, g_serr);
  if (r < 0) {
    Napi::Error::New(env, g_serr[0] ? g_serr : "swe_sol_eclipse_when_loc failed").ThrowAsJavaScriptException();
    return env.Null();
  }
  if (r == 0 && tret[0] == 0) return env.Null(); // not found
  Napi::Object out = Napi::Object::New(env);
  out.Set("jdMaximum", tret[0]);
  Napi::Array attrArr = Napi::Array::New(env, 11);
  for (int i = 0; i < 11; i++) attrArr[i] = attr[i];
  out.Set("attributes", attrArr);
  return out;
}

// swe_lun_occult_when_loc(jdStart, ipl, flags, geopos[3]) -> {jdMax, attr[11]}
static Napi::Value LunOccultWhenLoc(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  double geopos[3] = {0, 0, 0};
  Napi::Array geo = info[3].As<Napi::Array>();
  for (int i = 0; i < 3 && i < (int)geo.Length(); i++) geopos[i] = geo.Get(i).As<Napi::Number>().DoubleValue();
  double tret[10];
  double attr[20];
  memset(g_serr, 0, sizeof(g_serr));
  int32 r = swe_lun_occult_when_loc(info[0].As<Napi::Number>().DoubleValue(),
                                    info[1].As<Napi::Number>().Int32Value(),
                                    nullptr,
                                    info[2].As<Napi::Number>().Int32Value(),
                                    geopos, tret, attr, 0, g_serr);
  if (r < 0) {
    Napi::Error::New(env, g_serr[0] ? g_serr : "swe_lun_occult_when_loc failed").ThrowAsJavaScriptException();
    return env.Null();
  }
  if (r == 0 && tret[0] == 0) return env.Null();
  Napi::Object out = Napi::Object::New(env);
  out.Set("jdMaximum", tret[0]);
  Napi::Array attrArr = Napi::Array::New(env, 11);
  for (int i = 0; i < 11; i++) attrArr[i] = attr[i];
  out.Set("attributes", attrArr);
  return out;
}

// swe_set_sid_mode(sidMode, t0, ayanT0)
static Napi::Value SetSidMode(const Napi::CallbackInfo& info) {
  swe_set_sid_mode(info[0].As<Napi::Number>().Int32Value(),
                   info[1].As<Napi::Number>().DoubleValue(),
                   info[2].As<Napi::Number>().DoubleValue());
  return info.Env().Undefined();
}

// swe_close()
static Napi::Value Close(const Napi::CallbackInfo& info) {
  swe_close();
  return info.Env().Undefined();
}

static Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("version", Napi::Function::New(env, Version));
  exports.Set("setEphePath", Napi::Function::New(env, SetEphePath));
  exports.Set("setTopo", Napi::Function::New(env, SetTopo));
  exports.Set("setSidMode", Napi::Function::New(env, SetSidMode));
  exports.Set("julDay", Napi::Function::New(env, JulDay));
  exports.Set("revJul", Napi::Function::New(env, RevJul));
  exports.Set("utcToJd", Napi::Function::New(env, UtcToJd));
  exports.Set("utcTimeZone", Napi::Function::New(env, UtcTimeZone));
  exports.Set("deltat", Napi::Function::New(env, DeltaT));
  exports.Set("calcUt", Napi::Function::New(env, CalcUt));
  exports.Set("houses", Napi::Function::New(env, Houses));
  exports.Set("getPlanetName", Napi::Function::New(env, GetPlanetName));
  exports.Set("ayanamsaUt", Napi::Function::New(env, AyanamsaUt));
  exports.Set("azAlt", Napi::Function::New(env, AzAlt));
  exports.Set("phenoUt", Napi::Function::New(env, PhenoUt));
  exports.Set("solEclipseWhenLoc", Napi::Function::New(env, SolEclipseWhenLoc));
  exports.Set("lunOccultWhenLoc", Napi::Function::New(env, LunOccultWhenLoc));
  exports.Set("close", Napi::Function::New(env, Close));
  return exports;
}

NODE_API_MODULE(swisseph_node, Init)
