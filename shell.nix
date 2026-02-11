{ pkgs ? import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/nixos-unstable.tar.gz") {} }:

let
  node =
    if pkgs ? nodejs_22 then pkgs.nodejs_22
    else if pkgs ? nodejs_22_x then pkgs.nodejs_22_x
    else if pkgs ? nodejs_21 then pkgs.nodejs_21
    else if pkgs ? nodejs_20 then pkgs.nodejs_20
    else if pkgs ? nodejs_20_x then pkgs.nodejs_20_x
    else pkgs.nodejs;

  openssl = pkgs.openssl; # usa el openssl "default" del nixpkgs (debería matchear con node)
in
pkgs.mkShell {
  packages = with pkgs; [
    node
    postgresql_16
    openssl
    zlib
    stdenv.cc.cc.lib
  ];

  shellHook = ''
    export LD_LIBRARY_PATH=${openssl.out}/lib:${pkgs.zlib.out}/lib:${pkgs.stdenv.cc.cc.lib}/lib:$LD_LIBRARY_PATH
  '';
}
