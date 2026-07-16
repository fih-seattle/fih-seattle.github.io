import concurrent.futures, html, json, re, ssl, urllib.error, urllib.parse, urllib.request
from collections import Counter, defaultdict

SRC = '.codex_high_school_114_extract.json'
OUT = '.codex_high_school_114_link_audit.json'

def normalize(u):
    u = html.unescape(u).replace('\\n','').replace('\\r','').strip()
    u = re.split(r'[\\\u3000\uff0c\u3002\uff1b\uff09\u3009\u3011\u3010\u300c\u300d\u300e\u300f\u3001\u2661]', u)[0]
    u = u.rstrip('.,;:!?)\"\'*>`_')
    return u if u.startswith(('http://','https://')) and len(u) < 500 else ''

data=json.load(open(SRC,encoding='utf-8'))
sources=defaultdict(set)
for r in data['records']:
    for raw in r.get('urls',[]):
        u=normalize(raw)
        if u: sources[u].add(r['path'])

by_domain=Counter(urllib.parse.urlparse(u).netloc.lower() for u in sources)
bulk_domains={'taiwan.taiwanstay.net.tw','www.ptt.cc'}
targets=[]; bulk_samples=[]
for u in sources:
    host=urllib.parse.urlparse(u).netloc.lower()
    if host in bulk_domains:
        if not any(urllib.parse.urlparse(x).netloc.lower()==host for x in bulk_samples): bulk_samples.append(u)
    else: targets.append(u)
targets += bulk_samples

ctx=ssl.create_default_context()
def fetch(u):
    req=urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0 (course-outcome-link-audit/1.0)'})
    try:
        with urllib.request.urlopen(req,timeout=15,context=ctx) as resp:
            body=resp.read(131072)
            charset=resp.headers.get_content_charset() or 'utf-8'
            text=body.decode(charset,errors='replace')
            m=re.search(r'<title[^>]*>(.*?)</title>',text,re.I|re.S)
            title=re.sub(r'\s+',' ',html.unescape(m.group(1))).strip()[:300] if m else ''
            return {'url':u,'status':getattr(resp,'status',200),'final_url':resp.geturl(),'title':title,'content_type':resp.headers.get('Content-Type',''),'error':''}
    except urllib.error.HTTPError as e:
        return {'url':u,'status':e.code,'final_url':getattr(e,'url',u),'title':'','content_type':'','error':str(e)[:250]}
    except Exception as e:
        return {'url':u,'status':0,'final_url':u,'title':'','content_type':'','error':f'{type(e).__name__}: {e}'[:250]}

results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
    for x in ex.map(fetch,targets): results.append(x)

for x in results: x['sources']=sorted(sources[x['url']])
summary={
    'unique_urls':len(sources), 'audited_urls':len(results),
    'bulk_dataset_urls_not_individually_fetched':sum(n for d,n in by_domain.items() if d in bulk_domains)-len(bulk_samples),
    'domains':dict(by_domain.most_common()),
    'status_counts':dict(Counter(str(x['status']) for x in results)),
}
json.dump({'summary':summary,'results':results},open(OUT,'w',encoding='utf-8'),ensure_ascii=False,indent=2)
print(json.dumps(summary,ensure_ascii=False,indent=2))
