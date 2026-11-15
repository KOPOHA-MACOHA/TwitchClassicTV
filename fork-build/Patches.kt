package org.tvmod.classic.build

import app.morphe.patcher.patch.bytecodePatch
import app.morphe.patcher.patch.resourcePatch
import app.morphe.patcher.patch.Compatibility
import app.morphe.patcher.extensions.InstructionExtensions.instructions
import app.morphe.patcher.extensions.InstructionExtensions.replaceInstruction
import com.android.tools.smali.dexlib2.iface.instruction.ReferenceInstruction
import com.android.tools.smali.dexlib2.iface.instruction.OneRegisterInstruction
import com.android.tools.smali.dexlib2.iface.reference.StringReference
import java.util.zip.ZipInputStream
import org.w3c.dom.Element
import java.util.Properties

private val compatibility = Compatibility(packageName="com.fgl27.twitch", name="SmartTwitchTV 3.0.379")
private val uiAssets = resourcePatch {
    execute {
        val input = object {}.javaClass.classLoader.getResourceAsStream("classic-ui.zip")!!
        ZipInputStream(input).use { zip ->
            var entry = zip.nextEntry
            while(entry != null) {
                check((entry.name.startsWith("assets/") || entry.name.startsWith("res/")) && !entry.name.contains(".."))
                if(!entry.isDirectory) get(entry.name, false).apply {parentFile.mkdirs();writeBytes(zip.readBytes())}
                entry = zip.nextEntry
            }
        }
    }
}

val classicUi = bytecodePatch(name="SmartTwitchTV Classic local UI", description="Bundles the source UI with simplified player controls and local QR login.") {
    compatibleWith(compatibility)
    dependsOn(uiAssets)
    execute {
        val urls = mapOf(
            "https://fgl27.github.io/SmartTwitchTV/release/index.html" to "file:///android_asset/app/index.html",
            "https://smarttv-client-for-twitch.web.app/index.html" to "file:///android_asset/app/index.html",
            "https://fgl27.github.io/SmartTwitchTV/release/extrapageindex.html" to "file:///android_asset/app/Extrapage/index.html",
            "https://smarttv-client-for-twitch.web.app/extrapageindex.html" to "file:///android_asset/app/Extrapage/index.html"
        )
        val owners=mutableListOf<String>()
        classDefForEach { c -> if(c.methods.any { m -> m.implementation?.instructions?.any { i -> ((i as? ReferenceInstruction)?.reference as? StringReference)?.string in urls }==true })owners.add(c.type) }
        var count=0
        for(owner in owners)for(method in mutableClassDefBy(owner).methods){
            val code=method.implementation?.instructions?.toList()?:continue
            for((index,insn) in code.withIndex()){
                val old=((insn as? ReferenceInstruction)?.reference as? StringReference)?.string?:continue
                val replacement=urls[old]?:continue
                val register=(insn as OneRegisterInstruction).registerA
                method.replaceInstruction(index,"const-string v$register, \"$replacement\"")
                count++
            }
        }
        check(count>=4){"Expected both native WebView entry URLs; found $count"}
        println("Classic UI: redirected $count native page URL references to bundled assets")

    }
}
val identity = resourcePatch(name="Classic fork application identity",description="Installs beside SmartTwitchTV and official Twitch.") {
    compatibleWith(compatibility)
    finalize {
        document("AndroidManifest.xml").use {doc->
            val manifest=doc.documentElement;val old=manifest.getAttribute("package");val appId="org.tvmod.classic"
            check(old=="com.fgl27.twitch")
            manifest.setAttribute("package",appId)
            val build = Properties().apply { object {}.javaClass.classLoader.getResourceAsStream("classic-build.properties")!!.use { load(it) } }
            manifest.setAttribute("android:versionName",build.getProperty("versionName"))
            manifest.setAttribute("android:versionCode",build.getProperty("versionCode"))
            (doc.getElementsByTagName("application").item(0) as Element).setAttribute("android:label","Twitch Classic")
            val activities=doc.getElementsByTagName("activity")
            for(i in 0 until activities.length){val a=activities.item(i) as Element;if(a.getElementsByTagName("intent-filter").length>0)a.setAttribute("android:label","Twitch Classic")}
            for(tag in listOf("provider","permission","uses-permission")){
                val nodes=doc.getElementsByTagName(tag)
                for(i in 0 until nodes.length){val n=nodes.item(i) as Element;val attr=if(tag=="provider")"android:authorities" else "android:name";val value=n.getAttribute(attr);if(value.startsWith(old+"."))n.setAttribute(attr,value.replace(old,appId))}
            }
        }
    }
}
