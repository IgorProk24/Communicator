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
        private CallingSystem callingsystem;

        public void SetConnect(CallingSystem newCoonect)
        {
           callingsystem = newCoonect;
        }

        public void Connect()
        {
            callingsystem.Use();
        }
    }
}
