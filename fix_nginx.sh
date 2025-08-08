#!/bin/bash

# Backup the current nginx.conf
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup2

# Comment out the server blocks for dot1hundred.com in nginx.conf
# First server block (HTTP redirect) - lines around 40-62
sudo sed -i '40,62s/^/# /' /etc/nginx/nginx.conf

# Second server block (HTTPS with /api/ location) - lines around 64-133  
sudo sed -i '64,133s/^/# /' /etc/nginx/nginx.conf

# Test nginx configuration
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "Nginx config is valid. Reloading..."
    sudo systemctl reload nginx
    echo "Nginx reloaded successfully!"
else
    echo "Nginx config has errors. Restoring backup..."
    sudo cp /etc/nginx/nginx.conf.backup2 /etc/nginx/nginx.conf
fi
