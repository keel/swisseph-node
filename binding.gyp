{
  "variables": {
    # Path to the pristine Swiss Ephemeris C sources.
    # Override with: npm install --sse_dir=/path/to/swisseph-master
    "sse_dir%": "../swisseph-master"
  },
  "targets": [
    {
      "target_name": "swisseph_node",
      "sources": [
        "<(sse_dir)/sweph.c",
        "<(sse_dir)/swedate.c",
        "<(sse_dir)/swehouse.c",
        "<(sse_dir)/swejpl.c",
        "<(sse_dir)/swemmoon.c",
        "<(sse_dir)/swemplan.c",
        "<(sse_dir)/swecl.c",
        "<(sse_dir)/swehel.c",
        "<(sse_dir)/swephlib.c",
        "src/addon.cc"
      ],
      "include_dirs": [
        "<(sse_dir)",
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
