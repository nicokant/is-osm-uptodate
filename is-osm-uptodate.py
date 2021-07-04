#!/usr/bin/env python3

__version__ = "1.5"

from aiohttp import web

from jsonslicer import JsonSlicer
import simplejson as json

import gzip
import dateutil.parser
import datetime
import urllib.request
import urllib.parse
import time

API = "https://api.ohsome.org/v1/elementsFullHistory/geometry"
METADATA = "https://api.ohsome.org/v1/metadata"
CACHE_REFRESH = 60*60*24

def generateHeaders(referer):
    return {
        "User-Agent":"Is-OSM-uptodate/%s" % __version__,
        "Referer":referer,
        "Accept-Encoding":"gzip",
    }

featuresTime = time.time()
start, end = None, None

# TODO: ERROR HANDLING
#'{\n  "timestamp" : "2021-07-03T12:13:20.122893",\n  "status" : 400,\n  "message" : "The provided time parameter is not ISO-8601 conform.",\n  "requestUrl" : "https://api.ohsome.org/v1/elementsFullHistory/geometry?bboxes=9.188295196%2C45.4635324507%2C9.1926242813%2C45.4649771956&properties=metadata&showMetadata=true&time=None%2CNone&types=node"\n}'

def process(group, end):
    first, last = group[0], group[-1]
    if last['properties']['@validTo'] != end:
        return # feature has been deleted
    feature = {
        "type": "Feature",
        "geometry": last['geometry'],
        "properties": {
            "id": first['properties']['@osmId'].split('/')[1],
            "created": first['properties']['@validFrom'],
            "lastedit": last['properties']['@validFrom'],
            "version": last['properties']['@version'],
        }
    }
    lastedit = dateutil.parser.parse(feature["properties"]["lastedit"])
    now = datetime.datetime.now().astimezone()
    feature["properties"]["average_update_days"] = \
        (now-lastedit).days/feature["properties"]["version"]
    return feature


routes = web.RouteTableDef()

@routes.get('/api/getData')
async def getData(request):
    minx = request.rel_url.query.get('minx')
    miny = request.rel_url.query.get('miny')
    maxx = request.rel_url.query.get('maxx')
    maxy = request.rel_url.query.get('maxy')
    referer = request.rel_url.query.get('REFERER', "http://localhost:8000/")
    resp = web.StreamResponse(status=200, 
                              reason='OK', 
                              headers={'Content-Type': 'application/json'})
    await resp.prepare(request)
    global featuresTime, start, end
    args = [minx, miny, maxx, maxy]
    if time.time()-featuresTime > CACHE_REFRESH or not start or not end:
        metadata = json.load(urllib.request.urlopen(METADATA))
        temporal_extent = metadata["extractRegion"]["temporalExtent"]
        start = temporal_extent["fromTimestamp"]
        end = temporal_extent["toTimestamp"]
        end = end.rstrip('Z') + ":00Z" # WORKAROUND
        featuresTime = time.time()
    await resp.write('{"type": "FeatureCollection", "features": ['.encode("utf-8"))
    params = urllib.parse.urlencode({
        "bboxes": f"{minx},{miny},{maxx},{maxy}",
        "properties": "metadata",
        "showMetadata": "true",
        "time": f"{start},{end}",
        "types": "node",
    })
    separator_needed = False
    req = urllib.request.Request(API+'?'+params)
    for key, value in generateHeaders(referer).items():
        req.add_header(key, value)
    with urllib.request.urlopen(req) as resp_gzipped:
        resp_stream = gzip.GzipFile(fileobj=resp_gzipped)
        group = []
        for feature in JsonSlicer(resp_stream, ('features', None)):
            osmid = feature['properties']['@osmId']
            if len(group) == 0:
                group.append(feature)
            elif group[0]['properties']['@osmId'] == osmid:
                group.append(feature)
            else:
                processed = process(group, end)
                if processed:
                    if separator_needed:
                        await resp.write(','.encode("utf-8"))
                    else:
                        separator_needed = True
                    await resp.write(json.dumps(processed, use_decimal=True).encode("utf-8"))
                group = [feature]
        if group:
            processed = process(group, end)
            if processed:
                if separator_needed:
                    await resp.write(','.encode("utf-8"))
                else:
                    separator_needed = True
                await resp.write(json.dumps(processed, use_decimal=True).encode("utf-8"))
            group = []
    await resp.write(']}'.encode("utf-8"))
    return resp


app = web.Application()
app.add_routes(routes)
web.run_app(app, port=8080)
