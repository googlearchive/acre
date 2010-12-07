// Copyright 2007-2010 Google, Inc.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package com.google.acre.classstore;

public class StoredClass implements java.io.Serializable {

    private static final long serialVersionUID = 2597519550018861584L;

    private String _name;
    private byte[] _code;

    public StoredClass() {
    }

    public StoredClass(String name, byte[] code) {
        _name = name;
        _code = code;
    }

    public String name() {
        return _name;
    }

    public void name(String name) {
        _name = name;
    }

    public byte[] code() {
        return _code;
    }

    public void code(byte[] code) {
        _code = code;
    }
}
