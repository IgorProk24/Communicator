using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Data.Entity;

namespace TheCommunicatorLibrary
{
    public class Context
    {
        private ICallingSystem callingsystem;

        public void SetConnect(ICallingSystem newCoonect)
        {
           this.callingsystem = newCoonect;
        }

        public void Connect()
        {
            this.callingsystem.Use();
        }
    }
}
