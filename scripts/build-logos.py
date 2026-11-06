#!/usr/bin/env python3
"""Fetch provider logos once, store them in assets/logos/, and write data/logos.json.

Each provider part (a listing may name "Partner / Vendor") is mapped by hand to its official
domain. The site icon is fetched at the highest available size; anything under 32px is rejected
so the logo wall never shows a blurry mark. Brands covered by Simple Icons use its vector mark. Providers without a usable icon get a typographic
mark in the interface instead. Run:  python3 scripts/build-logos.py
"""
import json, os, re, sys, urllib.request, struct

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'logos')
META = os.path.join(ROOT, 'data', 'meta.json')

DOMAINS = {
    'redington': 'redingtongroup.com', 'cisco': 'cisco.com', 'dell technologies': 'delltechnologies.com', 'fortinet': 'fortinet.com',
    'crowdstrike': 'crowdstrike.com', 'palo alto networks': 'paloaltonetworks.com', 'relex solutions': 'relexsolutions.com', 'veeam': 'veeam.com',
    'deloitte consulting': 'deloitte.com', 'nutanix': 'nutanix.com', 'siemens': 'siemens.com', 'automation anywhere': 'automationanywhere.com',
    'schneider electric': 'se.com', 'red hat': 'redhat.com', 'cognizant': 'cognizant.com', 'moengage': 'moengage.com', 'oracle': 'oracle.com',
    'quantexa': 'quantexa.com', 'caylent': 'caylent.com', 'cisco thousandeyes': 'thousandeyes.com', 'fico': 'fico.com', 'freshworks': 'freshworks.com',
    'incedo': 'incedoinc.com', 'insight enterprises': 'insight.com', 'o9 solutions': 'o9solutions.com', 'phdata': 'phdata.io',
    'world wide technology': 'wwt.com', 'amazon web services': 'aws.amazon.com', 'aws': 'aws.amazon.com', 'amdocs': 'amdocs.com',
    'clevertap': 'clevertap.com', 'cloudzero': 'cloudzero.com', 'datadog': 'datadoghq.com', 'dxc connect': 'dxc.com', 'enterpret': 'enterpret.com',
    'feedzai': 'feedzai.com', 'fenergo': 'fenergo.com', 'fluent commerce': 'fluentcommerce.com', 'ge healthcare': 'gehealthcare.com', 'glean': 'glean.com',
    'globant': 'globant.com', 'infocepts': 'infocepts.com', 'innova solutions': 'innovasolutions.com', 'intenseye': 'intenseye.com', 'kobalt.io': 'kobalt.io',
    'launchdarkly': 'launchdarkly.com', 'locus': 'locus.sh', 'microsoft': 'microsoft.com', 'rightsline': 'rightsline.com', 'salesforce': 'salesforce.com',
    'snowflake': 'snowflake.com', 'syncron': 'syncron.com', 'trax': 'traxretail.com', 'trax technologies': 'traxtech.com', 'veovo': 'veovo.com',
    '1password': '1password.com', 'amadeus': 'amadeus.com', 'amplitude': 'amplitude.com', 'autodesk': 'autodesk.com', 'blackboard': 'blackboard.com',
    'blue yonder': 'blueyonder.com', 'cdw': 'cdw.com', 'druva': 'druva.com', 'certinia': 'certinia.com', 'controlant': 'controlant.com', 'criteo': 'criteo.com',
    'cropin': 'cropin.com', 'dalet': 'dalet.com', 'dataiku': 'dataiku.com', 'driivz': 'driivz.com', 'esri': 'esri.com', 'etq': 'etq.com', 'ggwp': 'ggwp.com',
    'globallogic': 'globallogic.com', 'ibs software': 'ibsplc.com', 'intellect design arena': 'intellectdesign.com', 'intersystems': 'intersystems.com',
    'iqvia': 'iqvia.com', 'itron': 'itron.com', 'keywords studios': 'keywordsstudios.com', 'labarchives': 'labarchives.com', 'lightcast': 'lightcast.io',
    'loopio': 'loopio.com', 'medidata': 'medidata.com', 'mri software': 'mrisoftware.com', 'nokia': 'nokia.com', 'nomios': 'nomios.com', 'pwc': 'pwc.com',
    'qure.ai': 'qure.ai', 'ramco systems': 'ramco.com', 'riskified': 'riskified.com', 'sirion': 'sirion.ai', 'slb': 'slb.com', 'subex': 'subex.com',
    'tailscale': 'tailscale.com', 'telus digital': 'telusdigital.com', 'trend micro': 'trendmicro.com', 'volante technologies': 'volantetech.com',
    'wiley': 'wiley.com', 'yardi': 'yardi.com', '3play media': '3playmedia.com', 'accela': 'accela.com', 'accenture': 'accenture.com', 'airbus': 'airbus.com',
    'algolia': 'algolia.com', 'xsolla': 'xsolla.com', 'aspentech': 'aspentech.com', 'emerson': 'emerson.com', 'aveva': 'aveva.com', 'databricks': 'databricks.com',
    'bühler': 'buhlergroup.com', 'claroty': 'claroty.com', 'cognex': 'cognex.com', 'computacenter': 'computacenter.com', 'confluent': 'confluent.io',
    'credo ai': 'credo.ai', 'cybage': 'cybage.com', 'decisiv': 'decisiv.com', 'deltek': 'deltek.com', 'descartes': 'descartes.com', 'elevenlabs': 'elevenlabs.io',
    'ellucian': 'ellucian.com', 'elsevier': 'elsevier.com', 'ericsson': 'ericsson.com', 'esentire': 'esentire.com', 'forter': 'forter.com',
    'fourkites': 'fourkites.com', 'fireflies.ai': 'fireflies.ai', 'gitguardian': 'gitguardian.com', 'goodyear': 'goodyear.com', 'hach': 'hach.com',
    'hcltech': 'hcltech.com', 'hitachi energy': 'hitachienergy.com', 'honeywell': 'honeywell.com', 'iata': 'iata.org', 'ibm consulting': 'ibm.com',
    'ifs': 'ifs.com', 'innovaccer': 'innovaccer.com', 'integral ad science': 'integralads.com', 'kentik': 'kentik.com', 'keyloop': 'keyloop.com',
    'kpler': 'kpler.com', 'labvantage': 'labvantage.com', 'leantaas': 'leantaas.com', 'logicgate': 'logicgate.com', 'manhattan associates': 'manh.com',
    'mediagenix': 'mediagenix.tv', 'mongodb': 'mongodb.com', 'nasdaq': 'nasdaq.com', 'ncr atleos': 'ncratleos.com', 'netafim': 'netafim.com',
    'netradyne': 'netradyne.com', 'netscout': 'netscout.com', 'nielseniq': 'nielseniq.com', 'npaw': 'npaw.com', 'ntt data deutschland se': 'nttdata.com',
    'oceaneering': 'oceaneering.com', 'oliver wyman': 'oliverwyman.com', 'omnicell': 'omnicell.com', 'openspace': 'openspace.ai', 'opentext': 'opentext.com',
    'orca security': 'orca.security', 'project44': 'project44.com', 'pros': 'pros.com', 'qlik': 'qlik.com', 'razer': 'razer.com', 'revinate': 'revinate.com',
    'samsara': 'samsara.com', 'sap': 'sap.com', 'searce': 'searce.com', 'sentry': 'sentry.io', 'servicenow': 'servicenow.com', 'sgs': 'sgs.com',
    'sift': 'sift.com', 'sita': 'sita.aero', 'softserve': 'softserveinc.com', 'solera': 'solera.com', 'sphera': 'sphera.com', 'steris': 'steris.com',
    'syniverse': 'syniverse.com', 'temenos': 'temenos.com', 'testo': 'testo.com', 'textio': 'textio.com', 'thomson reuters': 'thomsonreuters.com',
    'tiger analytics': 'tigeranalytics.com', 'tracelink': 'tracelink.com', 'tractable': 'tractable.ai', 'verisk': 'verisk.com', 'turnitin': 'turnitin.com',
    'uplight': 'uplight.com', 'ust': 'ust.com', 'viavi': 'viavisolutions.com', 'wipro': 'wipro.com', 'wiz': 'wiz.io', 'wso2': 'wso2.com', 'zones': 'zones.com',
    'westcon group': 'westcon.com', 'presidio': 'presidio.com', 'winnow': 'winnowsolutions.com', 'siemens healthineers': 'siemens-healthineers.com',
    'oracle health': 'oracle.com', 'provenir': 'provenir.com', 'gameanalytics': 'gameanalytics.com', 'moments lab': 'momentslab.com', 'salsify': 'salsify.com',
    'dizzion': 'dizzion.com', 'sekuro': 'sekuro.io', 'tec360 cloud': 'tec360cloud.com', 'netbuilder': 'netbuilder.com', 'noventiq europe': 'noventiq.com',
    'deloitte consulting (us)': 'deloitte.com', 'adastra corporation': 'adastracorp.com', 'augnito': 'augnito.ai', 'bureau': 'bureau.id',
    'circulor': 'circulor.com', 'clariant': 'clariant.com', 'emergent': 'emergentsoftware.net', 'everseen': 'everseen.com', 'goodyear': 'goodyear.com',
    'hammertech': 'hammertech.com', 'idea s (sas)': 'ideas.com', 'insurem o': 'insuremo.com', 'kpler': 'kpler.com', 'mindbridge': 'mindbridge.ai',
    'routeware': 'routeware.com', 'safetychain': 'safetychain.com', 'solcast': 'solcast.com', 'spendhq': 'spendhq.com', 'syte': 'syte.ai',
    'takadu': 'takadu.com', 'tecalliance': 'tecalliance.net', 'terra dotta': 'terradotta.com', 'tracegains': 'tracegains.com', 'venminder': 'venminder.com',
    'wsc sports': 'wsc-sports.com', 'aidash': 'aidash.com', 'cenosco': 'cenosco.com', 'foretellix': 'foretellix.com', 'sibros': 'sibros.tech',
}

# crisp vector marks from Simple Icons (CC0) where the brand is covered; preferred over site icons
SIMPLE = {
    'cisco': 'cisco', 'dell technologies': 'dell', 'fortinet': 'fortinet', 'palo alto networks': 'paloaltonetworks', 'veeam': 'veeam',
    'nutanix': 'nutanix', 'siemens': 'siemens', 'schneider electric': 'schneiderelectric', 'red hat': 'redhat', 'snowflake': 'snowflake',
    'datadog': 'datadog', 'databricks': 'databricks', 'mongodb': 'mongodb', 'sap': 'sap', 'nokia': 'nokia', 'ericsson': 'ericsson',
    'accenture': 'accenture', 'airbus': 'airbus', 'algolia': 'algolia', 'trend micro': 'trendmicro', 'tailscale': 'tailscale',
    '1password': '1password', 'dataiku': 'dataiku', 'autodesk': 'autodesk', 'esri': 'esri', 'elsevier': 'elsevier', 'iata': 'iata',
    'opentext': 'opentext', 'sentry': 'sentry', 'elevenlabs': 'elevenlabs', 'cisco thousandeyes': 'cisco',
}
SI = 'https://cdn.jsdelivr.net/npm/simple-icons@16.30.0'

SUFFIX = re.compile(r',?\s+(inc\.?|llp|ltd\.?|limited|sa|pty ltd\.?|a\.s\.|corporation|se|llc|technologies inc)$', re.I)


def key(part):
    k = part.strip().lower()
    for _ in range(3):
        k = SUFFIX.sub('', k).strip(' ,')
    return k


def png_size(data):
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        return struct.unpack('>II', data[16:24])
    return (0, 0)


def main():
    os.makedirs(OUT, exist_ok=True)
    meta = json.load(open(META))
    parts = sorted({p.strip() for pr in meta['providers'] for p in pr['name'].split(' / ')})
    by_domain, out, rejected = {}, {}, []
    hexes = {i['slug']: i['hex'] for i in json.load(urllib.request.urlopen(f'{SI}/data/simple-icons.json', timeout=30))}
    for part in parts:
        slug = SIMPLE.get(key(part))
        if slug and slug in hexes:
            fname = f'si-{slug}.svg'
            path = os.path.join(OUT, fname)
            if not os.path.exists(path):
                svg = urllib.request.urlopen(f'{SI}/icons/{slug}.svg', timeout=20).read().decode()
                svg = svg.replace('<svg ', f'<svg fill="#{hexes[slug]}" ', 1)
                open(path, 'w').write(svg)
            out[part] = fname
            continue
        dom = DOMAINS.get(key(part))
        if not dom:
            continue
        if dom not in by_domain:
            fname = re.sub(r'[^a-z0-9]+', '-', dom.lower()).strip('-') + '.png'
            path = os.path.join(OUT, fname)
            if not os.path.exists(path):
                try:
                    with urllib.request.urlopen(f'https://www.google.com/s2/favicons?domain={dom}&sz=128', timeout=20) as r:
                        data = r.read()
                except Exception as e:  # network or missing icon
                    rejected.append((part, str(e)))
                    by_domain[dom] = None
                    continue
                w, h = png_size(data)
                if min(w, h) < 32:
                    rejected.append((part, f'{w}x{h}'))
                    by_domain[dom] = None
                    continue
                open(path, 'wb').write(data)
            by_domain[dom] = fname
        if by_domain[dom]:
            out[part] = by_domain[dom]
    json.dump(out, open(os.path.join(ROOT, 'data', 'logos.json'), 'w'), indent=0, sort_keys=True)
    print(f'{len(out)} provider parts with logos, {len(set(out.values()))} files; rejected {len(rejected)}')
    for r in rejected:
        print('  rejected', r)


if __name__ == '__main__':
    sys.exit(main())
