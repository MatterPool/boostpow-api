#!/bin/sh
HOSTNAME1=ec2-35-162-7-102.us-west-2.compute.amazonaws.com
USERNAME=ubuntu
KEYFILEPATH="/Users/atman/bpkey.pem"
echo "Starting deploy to server... $HOSTNAME1"
rsync -rav -e "ssh -i $KEYFILEPATH"  --progress --exclude-from='./exclude_files_rsync.txt' ./ ubuntu@$HOSTNAME1:~/boostapi


HOSTNAME1=ec2-54-187-28-96.us-west-2.compute.amazonaws.com
USERNAME=ubuntu
echo "Starting deploy to server... $HOSTNAME1"
rsync -rav -e "ssh -i $KEYFILEPATH"  --progress --exclude-from='./exclude_files_rsync.txt' ./ ubuntu@$HOSTNAME1:~/boostapi

echo "\nDone. Bye..."
exit
