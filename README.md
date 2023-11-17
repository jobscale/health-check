# health check

## getting start
```bash
git clone https://github.com/jobscale/health-check.git
cd health-check
```

## local test
```bash
npm i
npm run lint
npm start
```

## container build and run
```bash
{
  docker build . -t local/health-check \
  && docker run --rm -it local/health-check
}
```

## Kubernetes

### create cronjob
```bash
kind load docker-image local/health-check --name production
kubectl create cronjob health-check --image local/health-check --schedule '0/7 * * * *'
```

### create one time job
```bash
kubectl create job --from=cronjob/health-check health-check-manual-$(date +'%Y%m%d-%H%M%S')
```
