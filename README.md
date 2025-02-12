# Is OSM up-to-date?

[![CircleCI](https://img.shields.io/circleci/build/github/frafra/is-osm-uptodate.svg)](https://circleci.com/gh/frafra/is-osm-uptodate)
[![Docker Image Size (latest by date)](https://img.shields.io/docker/image-size/frafra/is-osm-uptodate)](https://hub.docker.com/r/frafra/is-osm-uptodate)
[![pdm-managed](https://img.shields.io/badge/pdm-managed-blueviolet)](https://pdm.fming.dev)

This application helps you find which nodes have not been edited for a long time.

Demo: https://is-osm-uptodate.frafra.eu/

Page on OSM wiki: https://wiki.openstreetmap.org/wiki/Is_OSM_up-to-date

# Dependencies

- [Python 3](https://www.python.org/) (3.8 or greater)
- [PDM](https://pdm.fming.dev/)
- [uWSGI](https://uwsgi-docs.readthedocs.io/)
- [npm](https://www.npmjs.com/)
- [YAJI](https://github.com/lloyd/yajl)

## Optional

- Docker

# Run

# With Docker

```
pdm run docker_build
pdm run docker
```

# Without Docker

## Setup

Install YAJI library:
- Debian/Ubuntu users: `apt-get install libyajl-dev`
- Fedora users: `dnf install yajl-devel`

```
pdm install --no-self --production
pdm run npm # Build the web app
```

## Run

```
chmod +x $(pdm info --packages)/bin/*
pdm run web
```

## Docker image

### Ready to use

```
docker run --publish 8000:8000 frafra/is-osm-uptodate
```

### Custom image

```
pdm run docker
```

# How to use

## Web interface

Open http://localhost:8000. Try to change the location and click on the refresh button in order to get the nodes for the new bounding box.

## Command line

Example:

```
$ curl 'http://localhost:8000/api/getData?minx=9.188295196&miny=45.4635324507&maxx=9.1926242813&maxy=45.4649771956' -o milan-duomo.json
```

# How to develop

```
pipx install pdm
pdm install --no-self
pdm run develop
```

To develop the frontend, in addition to the previous commands, run, in a different terminal:

```
cd web && npm run develop
```

## Testing

```
seleniumbase install geckodriver
pdm run test
```

You can also run dockerized tests:

```
pdm run test_docker
```

# Common issues

## Error - Please try again

Try a smaller region or wait for a while. Be sure to have a stable connection.
