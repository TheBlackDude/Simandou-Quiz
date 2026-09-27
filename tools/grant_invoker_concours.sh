#!/bin/sh
# Autorise les navigateurs (allUsers) à appeler la Cloud Function « concours » (service Cloud Run créé au premier déploiement).
# Nécessaire une seule fois, après le premier `npm run deploy` qui crée la fonction, si le déploiement affiche
# « Unable to set the invoker for the IAM policy » (politique d'organisation). À lancer par le propriétaire : sh tools/grant_invoker_concours.sh
set -e
PROJECT=gouvernement-qcm
gcloud run services add-iam-policy-binding concours --region europe-west1 --project "$PROJECT" --member=allUsers --role=roles/run.invoker
echo "OK : allUsers peut invoquer concours"
