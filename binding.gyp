{
  "targets": [
    {
      "target_name": "swisseph_node",
      "sources": [
        "vendor/sweph.c",
        "vendor/swedate.c",
        "vendor/swehouse.c",
        "vendor/swejpl.c",
        "vendor/swemmoon.c",
        "vendor/swemplan.c",
        "vendor/swecl.c",
        "vendor/swehel.c",
        "vendor/swephlib.c",
        "src/addon.cc"
      ],
      "include_dirs": [
        "vendor",
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS",
        "NAPI_VERSION=8"
      ],
      "cflags": ["-Wno-declaration-after-statement"],
      "cflags_cc": ["-std=c++17"],
      "xcode_settings": {
        "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
        "MACOSX_DEPLOYMENT_TARGET": "10.15",
        "OTHER_CFLAGS": ["-Wno-declaration-after-statement"]
      },
      "conditions": [
        ["OS=='win'", {
          "define": ["SWISS_EPH_COMPAT"]
        }]
      ]
    }
  ]
}
