#!/bin/sh
HOSTNAME1=ec2-34-221-63-66.us-west-2.compute.amazonaws.com
USERNAME=ubuntu
KEYFILEPATH="/Users/sauron/git/me/bp_ec2_keypair.pem"
echo "Starting deploy to server... $HOSTNAME1"
rsync -rav -e "ssh -i $KEYFILEPATH"  --progress --exclude-from='./exclude_files_rsync.txt' ./ ubuntu@$HOSTNAME1:~/boostapi

echo "\nDone. Bye..."
exit
